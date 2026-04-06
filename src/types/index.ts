/** A silence region detected in the audio */
export interface SilenceRegion {
  id: string;
  start: number;   // seconds
  end: number;     // seconds
  duration: number; // seconds
  /** If true, this region will NOT be cut (user toggled it to "keep") */
  ignored: boolean;
}

/** The overall app state machine */
export type AppStage =
  | "upload"       // waiting for file
  | "extracting"   // extracting audio from video via ffmpeg
  | "detecting"    // running silence detection
  | "editing"      // interactive waveform editor
  | "processing"   // cutting with ffmpeg.wasm
  | "done";        // download ready

/** Progress info during ffmpeg operations */
export interface ProgressInfo {
  stage: string;
  percent: number;
}

/** User document schema for Firestore */
export interface UserDoc {
  email: string;
  displayName: string;
  photoURL: string;
  plan: "free" | "premium";
  usageCount: number;
  createdAt: number;
  lastProcessedAt: number;
}
