"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

function getVideoId(link: string): string | null {
  try {
    const u = new URL(link.trim());
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    return u.searchParams.get("v") ?? u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null;
  } catch { return null; }
}

const fmt = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(sec).padStart(2, "0")}`;
};

// "1:23", "01:02:03" or "83" -> seconds
const parse = (t: string) => t.split(":").reduce((acc, p) => acc * 60 + Number(p), 0);

function loadYTApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    if (!document.querySelector("script[src*='youtube.com/iframe_api']")) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
  });
}

export default function ClipPage() {
  const [link, setLink] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const playerRef = useRef<any>(null);
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    loadYTApi().then(() => {
      if (cancelled || !holderRef.current) return;
      playerRef.current?.destroy();
      const mount = document.createElement("div");
      holderRef.current.replaceChildren(mount);
      playerRef.current = new window.YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        events: {
          onReady: (e: any) => {
            const d = e.target.getDuration();
            setDuration(d);
            setStart(0);
            setEnd(Math.min(d, 30));
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, [videoId]);

  const load = () => {
    const id = getVideoId(link);
    setError(id ? "" : "That doesn't look like a YouTube link.");
    setVideoId(id);
  };

  const now = () => playerRef.current?.getCurrentTime?.() ?? 0;
  const preview = () => {
    playerRef.current?.seekTo(start, true);
    playerRef.current?.playVideo();
  };

  const download = async () => {
    setError("");
    setDownloading(true);
    try {
      const qs = new URLSearchParams({ url: link.trim(), start: String(start), end: String(end) });
      const res = await fetch(`/api/yt-clip?${qs}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Download failed.");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = `clip_${fmt(start)}-${fmt(end)}.mp4`.replace(/:/g, "-");
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  const input = "w-full rounded-md border border-slate-300 dark:border-white/20 bg-white dark:bg-[#111] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500";
  const btn = "rounded-md border border-slate-300 dark:border-white/20 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/10";
  const valid = end > start;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-24">
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">YouTube Clip Downloader</h1>
        <p className="mb-8 text-slate-600 dark:text-slate-400">Paste a link, pick the part you want, download just that part.</p>

        <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input className={input} placeholder="https://www.youtube.com/watch?v=..." value={link} onChange={(e) => setLink(e.target.value)} aria-label="YouTube link" />
          <button className="rounded-md bg-black dark:bg-white px-6 font-bold text-white dark:text-black text-sm hover:opacity-80">Load</button>
        </form>

        {videoId && (
          <div className="mt-8 space-y-6">
            <div ref={holderRef} className="aspect-video w-full overflow-hidden rounded-md bg-black" />

            {duration > 0 && (
              <div className="space-y-5 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111] p-6">
                {/* Visual selection bar */}
                <div className="relative h-2 rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="absolute h-2 rounded-full bg-violet-500" style={{ left: `${(start / duration) * 100}%`, width: `${(Math.max(0, end - start) / duration) * 100}%` }} />
                </div>

                {([["Start", start, setStart], ["End", end, setEnd]] as const).map(([label, val, set]) => (
                  <div key={label} className="flex flex-wrap items-center gap-3">
                    <span className="w-12 text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                    <input type="range" min={0} max={duration} step={0.1} value={val} onChange={(e) => set(Number(e.target.value))} className="flex-1 accent-violet-500" aria-label={`${label} time`} />
                    <input
                      key={val}
                      defaultValue={fmt(val)}
                      onBlur={(e) => { const s = parse(e.target.value); if (Number.isFinite(s)) set(Math.min(duration, Math.max(0, s))); }}
                      className="w-24 rounded-md border border-slate-300 dark:border-white/20 bg-transparent px-2 py-1 text-center font-mono text-sm text-slate-900 dark:text-white"
                      aria-label={`${label} time (m:ss)`}
                    />
                    <button className={btn} onClick={() => set(now())}>Use current time</button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button className={btn} onClick={preview} disabled={!valid}>▶ Preview from start</button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Selected: <b>{fmt(start)} → {fmt(end)}</b> ({valid ? fmt(end - start) : "invalid"})
                  </span>
                  <button
                    onClick={download}
                    disabled={!valid || downloading}
                    className="ml-auto rounded-md bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                  >
                    {downloading ? "Preparing clip..." : "Download selected part"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm font-medium text-red-500" role="alert">{error}</p>}
      </main>
    </>
  );
}
