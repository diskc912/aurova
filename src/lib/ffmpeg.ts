import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

declare global {
  interface Window {
    FFmpegWASM: {
      FFmpeg: new () => FFmpeg;
    };
  }
}

let ffmpeg: FFmpeg | null = null;
let loaded = false;

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

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    ),
  });

  loaded = true;
  return ffmpeg;
}

/**
 * Extract audio track from a video file as WAV
 */
export async function extractAudio(
  ff: FFmpeg,
  videoFile: File
): Promise<Blob> {
  const inputName = "input" + getExt(videoFile.name);

  await ff.writeFile(inputName, await fetchFile(videoFile));

  await ff.exec([
    "-i", inputName,
    "-vn",
    "-acodec", "pcm_s16le",
    "-ar", "44100",
    "-ac", "1",
    "audio.wav",
  ]);

  const data = await ff.readFile("audio.wav");

  await safeDelete(ff, inputName);
  await safeDelete(ff, "audio.wav");

  return new Blob([new Uint8Array(data as Uint8Array)], {
    type: "audio/wav",
  });
}

/**
 * Smart silence cut + concat (FAST MODE)
 * - Uses stream copy for video
 * - Re-encodes audio
 */
export async function cutAndConcatFast(
  ff: FFmpeg,
  videoFile: File,
  keepSegments: { start: number; end: number }[]
): Promise<Blob> {
  const inputName = "input" + getExt(videoFile.name);
  const outputName = "output.mp4";

  // Remove tiny segments (VERY IMPORTANT)
  keepSegments = keepSegments.filter(
    (seg) => seg.end - seg.start > 0.3
  );

  await ff.writeFile(inputName, await fetchFile(videoFile));

  const concatList = keepSegments
    .map(
      (seg) =>
        `file '${inputName}'\ninpoint ${seg.start}\noutpoint ${seg.end}`
    )
    .join("\n");

  await ff.writeFile("concat.txt", new TextEncoder().encode(concatList));

  await ff.exec([
    "-fflags", "+genpts",               // fix timestamps
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",

    "-avoid_negative_ts", "make_zero",
    "-vsync", "vfr",

    "-c:v", "copy",                    // ⚡ fast
    "-c:a", "aac",
    "-b:a", "192k",

    "-af", "aresample=async=1",        // 🔥 fix audio gaps

    "-movflags", "+faststart",
    outputName,
  ]);

  const result = await ff.readFile(outputName);

  await cleanup(ff, [inputName, "concat.txt", outputName]);

  return new Blob([new Uint8Array(result as Uint8Array)], {
    type: "video/mp4",
  });
}

/**
 * PERFECT MODE (NO LAG EVER)
 * - Re-encodes video (slower but flawless)
 */
export async function cutAndConcatPerfect(
  ff: FFmpeg,
  videoFile: File,
  keepSegments: { start: number; end: number }[]
): Promise<Blob> {
  const inputName = "input" + getExt(videoFile.name);
  const outputName = "output.mp4";

  keepSegments = keepSegments.filter(
    (seg) => seg.end - seg.start > 0.3
  );

  await ff.writeFile(inputName, await fetchFile(videoFile));

  const concatList = keepSegments
    .map(
      (seg) =>
        `file '${inputName}'\ninpoint ${seg.start}\noutpoint ${seg.end}`
    )
    .join("\n");

  await ff.writeFile("concat.txt", new TextEncoder().encode(concatList));

  await ff.exec([
    "-fflags", "+genpts",
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",

    "-avoid_negative_ts", "make_zero",

    "-c:v", "libx264",                 // 🧠 no stutter ever
    "-preset", "ultrafast",
    "-crf", "23",

    "-c:a", "aac",
    "-b:a", "192k",

    "-af", "aresample=async=1",

    "-movflags", "+faststart",
    outputName,
  ]);

  const result = await ff.readFile(outputName);

  await cleanup(ff, [inputName, "concat.txt", outputName]);

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

async function cleanup(ff: FFmpeg, files: string[]) {
  for (const f of files) {
    await safeDelete(ff, f);
  }
}