"use client";

import type { ProgressInfo } from "@/types";

interface ProcessingViewProps {
  progress: ProgressInfo;
  downloadUrl: string | null;
  fileName: string;
  onReset: () => void;
}

export default function ProcessingView({
  progress,
  downloadUrl,
  fileName,
  onReset,
}: ProcessingViewProps) {
  if (downloadUrl) {
    return (
      <div className="flex flex-col items-center gap-8 py-12">
        {/* Success animation */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 ring-1 ring-teal-500/30">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Processing Complete!</h2>
          <p className="text-sm text-slate-400">
            Your video is ready with all silences removed.
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href={downloadUrl}
            download={fileName}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Video
          </a>
          <button
            onClick={onReset}
            className="rounded-xl border border-slate-300 dark:border-white/10 px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-transparent dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
          >
            Process Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      {/* Spinner */}
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-500" />
        <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-t-fuchsia-500" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>

      <div className="w-full max-w-md text-center">
        <p className="mb-3 text-sm font-medium text-slate-400">
          {progress.stage}
        </p>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        </div>
        <span className="mt-1 text-xs text-slate-600">
          {Math.round(progress.percent)}%
        </span>
      </div>

      <p className="text-xs text-slate-600">
        All processing happens locally in your browser — nothing is uploaded.
      </p>
    </div>
  );
}
