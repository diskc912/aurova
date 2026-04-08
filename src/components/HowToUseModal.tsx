"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const Section = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
      <span className="text-base">{icon}</span> {title}
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const Row = ({ keys, desc }: { keys: string[]; desc: string }) => (
  <div className="flex items-start gap-3">
    <div className="flex shrink-0 flex-wrap gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded-md border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {k}
        </kbd>
      ))}
    </div>
    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

const Tip = ({ label, desc }: { label: string; desc: string }) => (
  <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] px-4 py-3">
    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">{label}</p>
    <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

export default function HowToUseModal({ open, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0f17] shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0f17] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 text-lg">📖</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">How to Use AutoCut</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="px-6 py-6">

          {/* Quick start */}
          <div className="mb-6 rounded-xl bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border border-violet-500/20 p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="text-violet-600 dark:text-violet-400">Quick start:</strong> Upload a video → AutoCut detects silence and draws red zones over them → Adjust as needed → Click <em>"Remove Silence & Download"</em>. Done!
            </p>
          </div>

          <Section icon="🎨" title="Region Colors">
            <Tip label="🔴 Red Region — Will Be Cut" desc="These sections are silence that AutoCut detected. They will be removed from the final video." />
            <Tip label="🟢 Teal Region — Kept (Ignored)" desc="Double-click any red region to turn it teal. This means 'keep this part — don't cut it.' Double-click again to switch back." />
          </Section>

          <Section icon="🖱️" title="Waveform Navigation">
            <Row keys={["Scroll"]} desc="Pan left and right through the waveform timeline." />
            <Row keys={["Ctrl", "Scroll"]} desc="Zoom in and out. Zoom is anchored to wherever your mouse cursor is, so you zoom into exactly the spot you're hovering." />
            <Row keys={["Alt", "Drag"]} desc="Click and drag to pan the timeline horizontally — like grabbing and sliding it." />
            <Row keys={["Zoom Slider"]} desc="The slider at the bottom of the waveform also controls the zoom level." />
          </Section>

          <Section icon="✂️" title="Editing Regions">
            <Row keys={["Drag to Draw"]} desc="Click and drag on an empty part of the waveform to draw a new red cut region manually." />
            <Row keys={["Drag Edges"]} desc="Drag the left or right edge of any region to resize it — make it shorter or longer." />
            <Row keys={["Double-click"]} desc="Toggle the region between red (cut) and teal (keep)." />
            <Row keys={["Click"]} desc="Select a region. A bright outline appears showing it is selected." />
            <Row keys={["Delete", "Backspace", "X"]} desc="Remove the selected region entirely from the waveform. The time range will be treated as normal video and won't be cut." />
            <Row keys={["Ctrl", "Z"]} desc="Undo the last region change — whether you added, moved, resized, toggled, or deleted a region." />
          </Section>

          <Section icon="⚙️" title="Settings Explained">
            <Tip label="Silence Threshold (dB)" desc="How quiet audio must be for it to count as 'silence'. -30 dB is a common sweet spot. Raise it (e.g. -20 dB) to detect more silence. Lower it (e.g. -50 dB) to only catch near-total silence." />
            <Tip label="Min Silence (sec)" desc="The shortest silence AutoCut will detect. Raising this (e.g. 1.0s) skips tiny brief pauses. Lowering (e.g. 0.2s) catches even short gaps." />
            <Tip label="Padding (sec)" desc="A buffer added around each silence. E.g. 0.2s padding keeps a small natural breath at the start and end of each cut — prevents the video feeling too 'choppy'." />
            <Tip label="Export Mode: FAST" desc="Stream-copies the video without re-encoding. Extremely fast (seconds). No quality loss. Best for most use cases." />
            <Tip label="Export Mode: PERFECT" desc="Re-encodes the video with H.264. Slightly slower but avoids rare audio sync or frame glitch issues on some video formats." />
            <Tip label="Voice Enhance: STUDIO" desc="Applies a broadcast-quality audio filter chain during export: removes background noise, cuts rumble below 80Hz, rolls off harsh highs, compresses dynamics, and normalises loudness to -16 LUFS. Ideal for podcasts, voiceovers, and talking-head videos." />
          </Section>

          <Section icon="🎵" title="Audio Preview">
            <Row keys={["Play / Pause Button"]} desc="Plays the extracted audio so you can hear what the final result will sound like. Active cut regions are automatically skipped during playback." />
            <Row keys={["Studio Toggle"]} desc="Toggle 'STUDIO' in Voice Enhance to hear a real-time preview of how your voice will sound with the enhancement applied." />
          </Section>

          <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] px-4 py-3 text-center">
            <p className="text-xs text-slate-500">100% client-side · Your files never leave your browser · No uploads to any server</p>
          </div>
        </div>
      </div>
    </div>
  );
}
