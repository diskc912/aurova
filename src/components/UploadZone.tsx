"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

export default function UploadZone({ onFileSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-sm border px-8 py-20 transition-all duration-300 backdrop-blur-xl ${
        isDragging
          ? "scale-[1.02] border-slate-500 bg-slate-500/10 shadow-lg"
          : "border-slate-300 dark:border-white/20 bg-white/40 dark:bg-white/5 hover:border-slate-500/40 hover:bg-white/60 dark:hover:bg-slate-500/10 shadow-sm hover:shadow-md"
      }`}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept="video/*,audio/*"
        className="hidden"
        onChange={handleChange}
      />

      {/* Icon */}
      <div
        className={`mb-6 flex h-20 w-20 items-center justify-center rounded-[4px] transition-all duration-300 shadow-sm ${
          isDragging
            ? "bg-slate-200 dark:bg-white/20 text-slate-800 dark:text-white"
            : "bg-slate-100 dark:bg-white/5 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-500/20 group-hover:text-slate-800 dark:group-hover:text-white"
        }`}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
        Drop your video or audio file here
      </h3>
      <p className="mb-4 text-sm text-slate-500">
        Supports MP4, MOV, MKV, WebM, AVI, MP3, WAV, and more
      </p>
      <button
        type="button"
        className="rounded-sm bg-black dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-black shadow-md transition hover:bg-slate-800 dark:hover:bg-slate-200 uppercase tracking-widest text-xs"
        onClick={(e) => {
          e.stopPropagation();
          document.getElementById("file-input")?.click();
        }}
      >
        Browse Files
      </button>

      {/* Dark mode shadow border pulse effect */}
      <div className="pointer-events-none absolute inset-0 rounded-sm bg-slate-400/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
}
