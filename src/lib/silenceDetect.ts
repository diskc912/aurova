import type { SilenceRegion } from "@/types";

/**
 * Detect silence regions from an AudioBuffer using RMS analysis.
 * Runs entirely in-browser via the Web Audio API.
 */
export function detectSilence(
  audioBuffer: AudioBuffer,
  thresholdDB: number = -30,
  minDurationSec: number = 0.5,
  paddingSec: number = 0.2
): SilenceRegion[] {
  const thresholdAmp = Math.pow(10, thresholdDB / 20);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // mono / left

  const chunkSize = 1024;
  let isSilent = false;
  let silenceStartSample = 0;
  const regions: SilenceRegion[] = [];
  let idCounter = 0;
  
  const totalDuration = channelData.length / sampleRate;

  const pushRegion = (start: number, endSec: number) => {
    // Apply padding: shrink silence to give "breathing room" to adjacent vocals
    // If silence touches the very beginning, don't pad the start
    const adjStart = start === 0 ? 0 : start + paddingSec;
    // If silence touches the very end, don't pad the end
    const adjEnd = endSec >= totalDuration - 0.05 ? endSec : endSec - paddingSec;
    
    const adjDuration = adjEnd - adjStart;

    if (adjDuration > 0 && endSec - start >= minDurationSec) {
      regions.push({
        id: `silence-${idCounter++}`,
        start: Number(adjStart.toFixed(3)),
        end: Number(adjEnd.toFixed(3)),
        duration: Number(adjDuration.toFixed(3)),
        ignored: false,
      });
    }
  };

  for (let i = 0; i < channelData.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, channelData.length);
    let sumSq = 0;
    for (let j = i; j < end; j++) {
      sumSq += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sumSq / (end - i));
    const currentlySilent = rms < thresholdAmp;

    if (currentlySilent && !isSilent) {
      isSilent = true;
      silenceStartSample = i;
    } else if (!currentlySilent && isSilent) {
      isSilent = false;
      const start = silenceStartSample / sampleRate;
      const endSec = i / sampleRate;
      pushRegion(start, endSec);
    }
  }

  // Handle silence at end of file
  if (isSilent) {
    const start = silenceStartSample / sampleRate;
    const endSec = channelData.length / sampleRate;
    pushRegion(start, endSec);
  }

  return regions;
}
