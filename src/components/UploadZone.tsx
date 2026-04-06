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
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-20 transition-all duration-300 ${
        isDragging
          ? "scale-[1.02] border-violet-500 bg-violet-500/10 shadow-2xl shadow-violet-500/10"
          : "border-white/10 bg-white/[0.02] hover:border-violet-500/40 hover:bg-violet-500/5"
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
        className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300 ${
          isDragging
            ? "bg-violet-500/20 text-violet-400"
            : "bg-white/5 text-slate-500 group-hover:bg-violet-500/10 group-hover:text-violet-400"
        }`}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <h3 className="mb-2 text-xl font-semibold text-white">
        Drop your video or audio file here
      </h3>
      <p className="mb-4 text-sm text-slate-500">
        Supports MP4, MOV, MKV, WebM, AVI, MP3, WAV, and more
      </p>
      <button
        type="button"
        className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-500 hover:shadow-violet-500/30"
        onClick={(e) => {
          e.stopPropagation();
          document.getElementById("file-input")?.click();
        }}
      >
        Browse Files
      </button>

      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600/0 via-violet-600/5 to-fuchsia-600/0 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
