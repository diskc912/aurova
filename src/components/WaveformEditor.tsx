"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { SilenceRegion } from "@/types";

interface WaveformEditorProps {
  audioUrl: string;
  regions: SilenceRegion[];
  onRegionsChange: (regions: SilenceRegion[]) => void;
  enhanceVoice: boolean;
}

export default function WaveformEditor({
  audioUrl,
  regions,
  onRegionsChange,
  enhanceVoice,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<any>(null);
  const wsRegionsRef = useRef<any>(null);
  const regionsRef = useRef(regions);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(10);

  // Scroll/pan state
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
  const mouseXRef = useRef(0);

  // Undo history (local to editor, where events actually fire)
  const historyRef = useRef<SilenceRegion[][]>([]);
  const selectedRegionIdRef = useRef<string | null>(null);

  // Push to history before any regions change
  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current, [...regionsRef.current]].slice(-50);
  }, []);

  // Web Audio Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<any>(null);
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const lowpassRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Keep regionsRef in sync
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  // Keyboard: Ctrl+Z = undo, Delete/Backspace = remove selected region
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't fire inside text inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (historyRef.current.length === 0) return;
        const prev = historyRef.current[historyRef.current.length - 1];
        historyRef.current = historyRef.current.slice(0, -1);
        if (wsRegionsRef.current) {
          const wsAll: any[] = wsRegionsRef.current.getRegions();
          // Remove WaveSurfer regions not in the restored state
          for (const wsr of wsAll) {
            if (!prev.find((r: SilenceRegion) => r.id === wsr.id)) wsr.remove();
          }
        }
        onRegionsChange(prev);
      }

      if ((e.key === "Delete" || e.key === "Backspace" || e.key === "x") && !e.ctrlKey && !e.metaKey) {
        const selId = selectedRegionIdRef.current;
        if (!selId) return;
        e.preventDefault();
        pushHistory();
        // Remove from WaveSurfer visually
        if (wsRegionsRef.current) {
          const wsAll = wsRegionsRef.current.getRegions();
          const target = wsAll.find((r: any) => r.id === selId);
          if (target) target.remove();
        }
        selectedRegionIdRef.current = null;
        onRegionsChange(regionsRef.current.filter((r) => r.id !== selId));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushHistory, onRegionsChange]);

  const handleDoubleClick = useCallback(
    (regionId: string) => {
      pushHistory();
      const updated = regionsRef.current.map((r) =>
        r.id === regionId ? { ...r, ignored: !r.ignored } : r
      );
      onRegionsChange(updated);
    },
    [onRegionsChange, pushHistory]
  );

  const handleRegionUpdate = useCallback(
    (regionId: string, start: number, end: number) => {
      pushHistory();
      const updated = regionsRef.current.map((r) =>
        r.id === regionId
          ? { ...r, start, end, duration: end - start }
          : r
      );
      onRegionsChange(updated);
    },
    [onRegionsChange, pushHistory]
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
        waveColor: "rgba(150, 150, 150, 0.35)",
        progressColor: "rgba(100, 100, 100, 0.70)",
        cursorColor: "#888888",
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
          region.on("click", () => {
            // Select this region for Delete key
            selectedRegionIdRef.current = newRegion.id;
            // Highlight: give it a bright border via element style
            const el = region.element as HTMLElement | undefined;
            if (el) { el.style.outline = "2px solid rgba(239,68,68,0.9)"; el.style.zIndex = "10"; }
          });

          pushHistory();
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
              ? "rgba(150, 150, 150, 0.15)"
              : "rgba(239, 68, 68, 0.30)",
            drag: true,
            resize: true,
          });

          // Double-click to toggle keep/cut
          region.on("dblclick", () => {
            handleDoubleClick(r.id);
          });

          // Click to select
          region.on("click", () => {
            selectedRegionIdRef.current = r.id;
            const el = region.element as HTMLElement | undefined;
            if (el) { el.style.outline = "2px solid rgba(239,68,68,0.9)"; el.style.zIndex = "10"; }
          });

          // Drag/resize to update boundaries
          region.on("update-end", () => {
            handleRegionUpdate(r.id, region.start, region.end);
          });
        });

        // Initialize Web Audio Emulation upon loaded media element
        try {
          const audioEl = ws.getMediaElement();
          if (audioEl && !sourceRef.current) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioCtx();
            const ctx = audioCtxRef.current;
            sourceRef.current = ctx.createMediaElementSource(audioEl);

            highpassRef.current = ctx.createBiquadFilter();
            highpassRef.current.type = "highpass";
            highpassRef.current.frequency.value = 80;

            lowpassRef.current = ctx.createBiquadFilter();
            lowpassRef.current.type = "lowpass";
            lowpassRef.current.frequency.value = 12000;

            compressorRef.current = ctx.createDynamicsCompressor();
            compressorRef.current.threshold.value = -20;
            compressorRef.current.ratio.value = 4;

            gainRef.current = ctx.createGain();
            gainRef.current.gain.value = 1.78; // Approx +5dB makeup

            // Static internal connections
            highpassRef.current.connect(lowpassRef.current);
            lowpassRef.current.connect(compressorRef.current);
            compressorRef.current.connect(gainRef.current);

            // Initial manual routing
            sourceRef.current.connect(ctx.destination);
          }
        } catch (e) {
          console.warn("Could not init WebAudio preview:", e);
        }
      });

      // Play/pause driven ONLY by the dedicated button — clicking the waveform
      // just seeks the playhead, it does NOT auto-play.
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

  // Wheel handler: plain scroll → pan, Ctrl+scroll → zoom-to-cursor
  // Must be on wrapperRef (the overflow-x-auto div), NOT containerRef (WaveSurfer intercepts that)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Track mouse X so we know where to anchor the zoom
    const trackMouseX = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      mouseXRef.current = e.clientX - rect.left;
    };
    wrapper.addEventListener("mousemove", trackMouseX);

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom-to-cursor: keep the time under the mouse fixed after zoom
        e.preventDefault();
        setZoom((prev) => {
          const newZoom = Math.max(10, Math.min(300, prev + (e.deltaY < 0 ? 15 : -15)));
          if (wsRef.current) {
            wsRef.current.zoom(newZoom);
            // After the zoom, re-anchor scroll so the hovered time stays put:
            // timeAtMouse = (scrollLeft + mouseX) / oldZoom
            // newScrollLeft = timeAtMouse * newZoom - mouseX
            const mouseX = mouseXRef.current;
            const timeAtMouse = (wrapper.scrollLeft + mouseX) / prev;
            requestAnimationFrame(() => {
              wrapper.scrollLeft = timeAtMouse * newZoom - mouseX;
            });
          }
          return newZoom;
        });
      } else {
        // Convert vertical scroll → horizontal pan
        e.preventDefault();
        wrapper.scrollLeft += e.deltaY * 2;
      }
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      wrapper.removeEventListener("wheel", handleWheel);
      wrapper.removeEventListener("mousemove", trackMouseX);
    };
  }, []);

  // Alt+drag to pan
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, scrollLeft: wrapper.scrollLeft };
      wrapper.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const dx = e.clientX - dragStartRef.current.x;
      wrapper.scrollLeft = dragStartRef.current.scrollLeft - dx;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      wrapper.style.cursor = "";
    };

    wrapper.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      wrapper.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Toggle Studio Voice Emulation Switch
  useEffect(() => {
    const src = sourceRef.current;
    const ctx = audioCtxRef.current;
    const hpf = highpassRef.current;
    const gain = gainRef.current;

    if (!src || !ctx || !hpf || !gain) return;

    // Flush current links
    src.disconnect();
    gain.disconnect();

    if (enhanceVoice) {
      if (ctx.state === "suspended") ctx.resume();
      src.connect(hpf);
      gain.connect(ctx.destination);
    } else {
      src.connect(ctx.destination);
    }
  }, [enhanceVoice]);

  // Sync region colors when `regions` (toggled state) changes
  useEffect(() => {
    if (!wsRegionsRef.current) return;

    const allWsRegions = wsRegionsRef.current.getRegions();
    for (const wsRegion of allWsRegions) {
      const match = regions.find((r) => r.id === wsRegion.id);
      if (match) {
        wsRegion.setOptions({
          color: match.ignored
            ? "rgba(150, 150, 150, 0.15)"
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
      {/* Waveform — overflow-x-auto so it scrolls when zoomed in */}
      <div
        ref={wrapperRef}
        className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/30 p-4 scroll-smooth"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,0.4) transparent" }}
      >
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
            <span className="inline-block h-3 w-6 rounded bg-slate-400/30" />
            <span className="text-slate-600 dark:text-slate-400">Ignored / Kept</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-sm bg-slate-200 dark:bg-white/10 px-3 py-1 font-semibold text-slate-800 dark:text-slate-300">
            {activeRegions.length} cuts
          </span>
          <span className="rounded-sm bg-slate-200 dark:bg-white/10 px-3 py-1 font-semibold text-slate-800 dark:text-slate-300">
            {totalSaved.toFixed(1)}s saved
          </span>
        </div>
      </div>

      {/* PRIMARY PLAYBACK ENGINE */}
      <div className="flex flex-col items-center justify-center py-8 border-y border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <button
          onClick={() => wsRef.current?.playPause()}
          className="group relative flex h-20 w-20 items-center justify-center rounded-[4px] bg-black dark:bg-white text-white dark:text-black shadow-md transition-all hover:scale-105 active:scale-95 hover:opacity-80 focus:outline-none"
        >
          {isPlaying ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="ml-2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-600">
          Studio Playback
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 py-4">
        <div className="flex w-full max-w-2xl items-center justify-between gap-4 py-2">
          <div className="flex flex-1 items-center gap-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
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
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-800 dark:bg-white/10 dark:accent-white"
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="11" y1="8" x2="11" y2="14" />
            </svg>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-600">
          <strong className="text-slate-700 dark:text-slate-400">Scroll</strong> to pan
          &nbsp;·&nbsp;
          <strong className="text-slate-700 dark:text-slate-400">Ctrl+Scroll</strong> to zoom
          &nbsp;·&nbsp;
          <strong className="text-slate-700 dark:text-slate-400">Click</strong> region to select
          &nbsp;·&nbsp;
          <strong className="text-slate-700 dark:text-slate-400">Delete / X</strong> to remove selected
          &nbsp;·&nbsp;
          <strong className="text-slate-700 dark:text-slate-400">Ctrl+Z</strong> to undo
          &nbsp;·&nbsp;
          <strong className="text-slate-700 dark:text-slate-400">Double-click</strong> to toggle cut
        </p>
      </div>
    </div>
  );
}
