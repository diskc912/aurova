"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { SilenceRegion } from "@/types";

interface WaveformEditorProps {
  audioUrl: string;
  regions: SilenceRegion[];
  onRegionsChange: (regions: SilenceRegion[]) => void;
}

export default function WaveformEditor({
  audioUrl,
  regions,
  onRegionsChange,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<any>(null);
  const wsRegionsRef = useRef<any>(null);
  const regionsRef = useRef(regions);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(10);

  // Keep regionsRef in sync
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  const handleDoubleClick = useCallback(
    (regionId: string) => {
      const updated = regionsRef.current.map((r) =>
        r.id === regionId ? { ...r, ignored: !r.ignored } : r
      );
      onRegionsChange(updated);
    },
    [onRegionsChange]
  );

  const handleRegionUpdate = useCallback(
    (regionId: string, start: number, end: number) => {
      const updated = regionsRef.current.map((r) =>
        r.id === regionId
          ? { ...r, start, end, duration: end - start }
          : r
      );
      onRegionsChange(updated);
    },
    [onRegionsChange]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    async function init() {
      // Dynamic import to avoid SSR issues
      const WaveSurfer = (await import("wavesurfer.js")).default;
      const RegionsPlugin = (
        await import("wavesurfer.js/dist/plugins/regions.esm.js")
      ).default;

      if (destroyed || !containerRef.current) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "rgba(124, 58, 237, 0.35)",
        progressColor: "rgba(124, 58, 237, 0.7)",
        cursorColor: "#2dd4bf",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 140,
        normalize: true,
        url: audioUrl,
      });

      const wsRegions = ws.registerPlugin(RegionsPlugin.create());

      // 1. Enable Drag Selection to manually draw new cut regions
      wsRegions.enableDragSelection({
        color: "rgba(239, 68, 68, 0.30)",
      });

      // Listen for newly drawn regions and map them back to the React state
      wsRegions.on("region-created", (region: any) => {
        const exists = regionsRef.current.find((r) => r.id === region.id);
        if (!exists) {
          const newRegion = {
            id: region.id,
            start: region.start,
            end: region.end,
            duration: region.end - region.start,
            ignored: false,
          };

          region.on("dblclick", () => {
            handleDoubleClick(newRegion.id);
          });
          region.on("update-end", () => {
            handleRegionUpdate(newRegion.id, region.start, region.end);
          });

          onRegionsChange([...regionsRef.current, newRegion]);
        }
      });

      wsRef.current = ws;
      wsRegionsRef.current = wsRegions;

      ws.on("ready", () => {
        if (destroyed) return;
        // Add all silence regions
        regionsRef.current.forEach((r) => {
          const region = wsRegions.addRegion({
            id: r.id,
            start: r.start,
            end: r.end,
            color: r.ignored
              ? "rgba(45, 212, 191, 0.25)"
              : "rgba(239, 68, 68, 0.30)",
            drag: true,
            resize: true,
          });

          // Double-click to toggle
          region.on("dblclick", () => {
            handleDoubleClick(r.id);
          });

          // Drag/resize to update boundaries
          region.on("update-end", () => {
            handleRegionUpdate(r.id, region.start, region.end);
          });
        });
      });

      // Play/pause events to sync local react state
      ws.on("interaction", () => {
        ws.playPause();
      });
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));

      // 2. Smart Preview: Skip cuts while listening
      ws.on("timeupdate", (currentTime: number) => {
        if (destroyed) return;
        const activeCuts = regionsRef.current.filter((r) => !r.ignored);
        for (const cut of activeCuts) {
          // If the playhead wanders into an active red cut region, instantly skip to its end!
          if (currentTime >= cut.start && currentTime < cut.end) {
            ws.setTime(cut.end);
            break;
          }
        }
      });
    }

    init();

    return () => {
      destroyed = true;
      if (wsRef.current) {
        wsRef.current.destroy();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Zoom via Ctrl+Scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((prev) => {
          const newZoom = Math.max(10, Math.min(300, prev + (e.deltaY < 0 ? 15 : -15)));
          if (wsRef.current) {
            wsRef.current.zoom(newZoom);
          }
          return newZoom;
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Sync region colors when `regions` (toggled state) changes
  useEffect(() => {
    if (!wsRegionsRef.current) return;

    const allWsRegions = wsRegionsRef.current.getRegions();
    for (const wsRegion of allWsRegions) {
      const match = regions.find((r) => r.id === wsRegion.id);
      if (match) {
        wsRegion.setOptions({
          color: match.ignored
            ? "rgba(45, 212, 191, 0.25)"
            : "rgba(239, 68, 68, 0.30)",
        });
      }
    }
  }, [regions]);

  // Stats
  const activeRegions = regions.filter((r) => !r.ignored);
  const totalSaved = activeRegions.reduce((s, r) => s + r.duration, 0);

  return (
    <div className="space-y-4">
      {/* Waveform */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/30 p-4">
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Legend + Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-6 rounded bg-red-500/40" />
            <span className="text-slate-600 dark:text-slate-400">
              Will be cut ({activeRegions.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-6 rounded bg-teal-400/30" />
            <span className="text-slate-600 dark:text-slate-400">Ignored / Kept</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full bg-violet-500/10 px-3 py-1 font-semibold text-violet-300">
            {activeRegions.length} cuts
          </span>
          <span className="rounded-full bg-teal-500/10 px-3 py-1 font-semibold text-teal-300">
            {totalSaved.toFixed(1)}s saved
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between gap-4 py-2 border-t border-slate-200 dark:border-white/5 pt-4 mt-2">
          {/* Zoom Slider Control */}
          <div className="flex flex-1 items-center gap-3 ml-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={zoom}
              onChange={(e) => {
                const val = Number(e.target.value);
                setZoom(val);
                wsRef.current?.zoom(val);
              }}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-violet-500 dark:bg-white/10"
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="11" y1="8" x2="11" y2="14" />
            </svg>
          </div>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={() => wsRef.current?.playPause()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105 hover:bg-violet-500 focus:outline-none"
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
          
          <div className="flex-1" /> {/* Spacer */}
        </div>

        {/* Instructions */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-600">
          <strong className="text-slate-700 dark:text-slate-400">Drag</strong> region edges
          &nbsp;·&nbsp;
          <strong className="text-slate-700 dark:text-slate-400">Double-click</strong> to select
          &nbsp;·&nbsp;
          <strong className="text-slate-700 dark:text-slate-400">Ctrl + Scroll</strong> to zoom
        </p>
      </div>
    </div>
  );
}
