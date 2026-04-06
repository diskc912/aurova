"use client";

import { useEffect, useRef, useCallback } from "react";
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

      // Play/pause on click
      ws.on("interaction", () => {
        ws.playPause();
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
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/30 p-4">
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Legend + Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-6 rounded bg-red-500/40" />
            <span className="text-slate-400">
              Will be cut ({activeRegions.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-6 rounded bg-teal-400/30" />
            <span className="text-slate-400">Ignored / Kept</span>
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

      {/* Instructions */}
      <p className="text-center text-xs text-slate-600">
        <strong className="text-slate-400">Drag</strong> region edges to adjust
        &nbsp;·&nbsp;
        <strong className="text-slate-400">Double-click</strong> a region to toggle keep/cut
        &nbsp;·&nbsp;
        <strong className="text-slate-400">Click</strong> waveform to play/pause
      </p>
    </div>
  );
}
