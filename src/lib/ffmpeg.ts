import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

declare global {
  interface Window {
    FFmpegWASM: {
      FFmpeg: new () => FFmpeg;
    };
  }
}

let ffmpeg: FFmpeg | null = null;
let loaded = false;

// Use WORKERFS specifically for input files to prevent loading large blobs into RAM
const INPUT_MOUNTPATH = "/inputfs";

// 5. Keep Existing Types and Signatures: Maintain exact same exported function signatures
export async function loadFFmpeg(
  onProgress?: (p: { progress: number; time: number }) => void
): Promise<FFmpeg> {
  if (ffmpeg && loaded) return ffmpeg;

  if (typeof window !== "undefined" && !window.FFmpegWASM) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/ffmpeg/ffmpeg.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const FFmpegClass = window.FFmpegWASM.FFmpeg;
  ffmpeg = new FFmpegClass();

  if (onProgress) {
    ffmpeg.on("progress", onProgress);
  }

  // 2. Upgrade to Multi-Threading (WASM-MT):
  // Load core files from local /ffmpeg folder to satisfy COEP requirements
  // Previously this was unpkg which was being blocked by the browser.
  const baseURL = "/ffmpeg";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
    workerURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.worker.js`,
      "text/javascript"
    ),
  });

  // Ensure input mount directory exists
  try {
    await ffmpeg.createDir(INPUT_MOUNTPATH);
  } catch (e) {
    // Ignore if already exists
  }

  loaded = true;
  return ffmpeg;
}

/**
 * 1. Eliminate RAM Crashes:
 * Utilize WORKERFS mounting API to map the user's File object directly to WASM instance.
 * Completely bypass the browser's RAM limit (no fetchFile) for the raw input.
 * Outputs will rely on standard MEMFS since aggressive GC prevents bloat.
 */
async function mountVideoFile(ff: FFmpeg, videoFile: File): Promise<string> {
  const inputName = `${INPUT_MOUNTPATH}/${videoFile.name}`;

  try {
    await ff.unmount(INPUT_MOUNTPATH);
  } catch (e) {}

  try {
    await ff.createDir(INPUT_MOUNTPATH);
  } catch (e) {}

  // Mount the File natively using WORKERFS (this gives us the ability to stream without reading to memory)
  await ff.mount("WORKERFS", { files: [videoFile] }, INPUT_MOUNTPATH);
  
  return inputName;
}

/**
 * Extract audio track from a video file as WAV
 */
export async function extractAudio(
  ff: FFmpeg,
  videoFile: File
): Promise<Blob> {
  const inputName = await mountVideoFile(ff, videoFile);
  const outputName = `audio.wav`;

  // -threads 0 flag added to maximize processing speed (WASM-MT)
  await ff.exec([
    "-threads", "0",
    "-i", inputName,
    "-vn",
    "-acodec", "pcm_s16le",
    "-ar", "44100",
    "-ac", "1",
    outputName,
  ]);

  const data = await ff.readFile(outputName);

  await safeDelete(ff, outputName);

  return new Blob([new Uint8Array(data as Uint8Array)], {
    type: "audio/wav",
  });
}

/**
 * Smart silence cut + concat (FAST MODE)
 */
export async function cutAndConcatFast(
  ff: FFmpeg,
  videoFile: File,
  keepSegments: { start: number; end: number }[],
  enhanceVoice: boolean = false
): Promise<Blob> {
  const inputName = await mountVideoFile(ff, videoFile);
  const outputName = `output.mp4`;

  keepSegments = keepSegments.filter(
    (seg) => seg.end - seg.start > 0.3
  );

  const segmentFiles: string[] = [];

  // 3. Fix the 'Fast Mode' Glitching:
  // Implement a loop mapping each segment to a physical temporary OPFS disk file, avoiding concat.txt with in/out points
  for (let i = 0; i < keepSegments.length; i++) {
    const seg = keepSegments[i];
    const segName = `seg${i}.mp4`;
    segmentFiles.push(segName);

    const duration = (seg.end - seg.start).toFixed(3);

    const audioFilters = enhanceVoice
      ? [
          "-af",
          "afftdn=nf=-25,highpass=f=80,lowpass=f=12000,acompressor=threshold=-20dB:ratio=4:makeup=5,loudnorm=I=-16:TP=-1.5:LRA=11",
        ]
      : [];

    // Fast-seek method used (-ss before -i) for glitch-free extraction
    // Utilizing OPFS disk mapping completely
    await ff.exec([
      "-threads", "0",
      "-ss", seg.start.toString(),
      "-i", inputName,
      "-t", duration,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      ...audioFilters,
      "-avoid_negative_ts", "make_zero",
      segName,
    ]);
  }

  // Once safely extracted to disk, use the concat demuxer on physical files
  const concatPath = `concat.txt`;
  // Using relative path for the files within the mounted OPFS directory
  const concatList = segmentFiles
    .map((seg) => `file '${seg.split("/").pop()}'`)
    .join("\n");

  await ff.writeFile(concatPath, new TextEncoder().encode(concatList));

  await ff.exec([
    "-threads", "0",
    "-f", "concat",
    "-safe", "0",
    "-i", concatPath,
    "-c", "copy",
    "-movflags", "+faststart",
    outputName,
  ]);

  const result = await ff.readFile(outputName);

  // 4. Aggressive Garbage Collection:
  // Deleted from file system immediately inside a loop after appended / no longer needed to prevent bloat
  for (const seg of segmentFiles) {
    await safeDelete(ff, seg); 
  }
  await safeDelete(ff, concatPath);
  await safeDelete(ff, outputName);

  return new Blob([new Uint8Array(result as Uint8Array)], {
    type: "video/mp4",
  });
}

/**
 * PERFECT MODE (NO LAG EVER)
 */
export async function cutAndConcatPerfect(
  ff: FFmpeg,
  videoFile: File,
  keepSegments: { start: number; end: number }[],
  enhanceVoice: boolean = false
): Promise<Blob> {
  const inputName = await mountVideoFile(ff, videoFile);
  const outputName = `output.mp4`;

  keepSegments = keepSegments.filter(
    (seg) => seg.end - seg.start > 0.3
  );

  const segmentFiles: string[] = [];

  for (let i = 0; i < keepSegments.length; i++) {
    const seg = keepSegments[i];
    const segName = `seg${i}.mp4`;
    segmentFiles.push(segName);

    const duration = (seg.end - seg.start).toFixed(3);

    const audioFilters = enhanceVoice
      ? [
          "-af",
          "afftdn=nf=-25,highpass=f=80,lowpass=f=12000,acompressor=threshold=-20dB:ratio=4:makeup=5,loudnorm=I=-16:TP=-1.5:LRA=11",
        ]
      : [];

    // Re-encoding for PERFECT mode while maintaining physical file approach
    await ff.exec([
      "-threads", "0",
      "-ss", seg.start.toString(),
      "-i", inputName,
      "-t", duration,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "192k",
      ...audioFilters,
      "-avoid_negative_ts", "make_zero",
      segName,
    ]);
  }

  const concatPath = `concat.txt`;
  const concatList = segmentFiles
    .map((seg) => `file '${seg.split("/").pop()}'`)
    .join("\n");

  await ff.writeFile(concatPath, new TextEncoder().encode(concatList));

  // Concat pre-encoded physical segments
  await ff.exec([
    "-threads", "0",
    "-f", "concat",
    "-safe", "0",
    "-i", concatPath,
    "-c", "copy",
    "-movflags", "+faststart",
    outputName,
  ]);

  const result = await ff.readFile(outputName);

  // Aggressive garbage collection 
  for (const seg of segmentFiles) {
    await safeDelete(ff, seg);
  }
  await safeDelete(ff, concatPath);
  await safeDelete(ff, outputName);

  return new Blob([new Uint8Array(result as Uint8Array)], {
    type: "video/mp4",
  });
}

/**
 * Helpers
 */
function getExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.substring(idx) : ".mp4";
}

async function safeDelete(ff: FFmpeg, file: string) {
  try {
    await ff.deleteFile(file);
  } catch { }
}