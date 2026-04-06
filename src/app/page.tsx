"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import type { AppStage, SilenceRegion, ProgressInfo } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { loadFFmpeg, extractAudio, cutAndConcatFast, cutAndConcatPerfect } from "@/lib/ffmpeg";
import { detectSilence } from "@/lib/silenceDetect";
import {
  isGuestLimitReached,
  incrementGuestUsage,
  incrementFirestoreUsage,
} from "@/lib/usageTracker";

import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";
import ProcessingView from "@/components/ProcessingView";
import AuthModal from "@/components/AuthModal";

// Dynamic import to avoid SSR for WaveSurfer
const WaveformEditor = dynamic(
  () => import("@/components/WaveformEditor"),
  { ssr: false }
);

export default function Home() {
  const { user } = useAuth();

  // App state machine
  const [stage, setStage] = useState<AppStage>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [regions, setRegions] = useState<SilenceRegion[]>([]);
  const [progress, setProgress] = useState<ProgressInfo>({
    stage: "",
    percent: 0,
  });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Settings
  const [threshold, setThreshold] = useState(-30);
  const [minDuration, setMinDuration] = useState(0.5);
  const [padding, setPadding] = useState(0.2);
  const [exportMode, setExportMode] = useState<"fast" | "perfect">("fast");

  // Refs for cleanup
  const audioUrlRef = useRef<string>("");

  // ── File Selected ──
  const handleFileSelected = useCallback(async (file: File) => {
    setVideoFile(file);
    setStage("extracting");
    setProgress({ stage: "Loading ffmpeg engine...", percent: 5 });

    try {
      // ffmpeg and silenceDetect are now imported at the top level

      const ff = await loadFFmpeg((p) => {
        setProgress({
          stage: "Extracting audio track...",
          percent: 10 + p.progress * 40,
        });
      });

      setProgress({ stage: "Extracting audio track...", percent: 15 });
      const audioBlob = await extractAudio(ff, file);

      // Create URL for waveform
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      setAudioUrl(url);

      // Detect silence
      setStage("detecting");
      setProgress({ stage: "Analyzing audio for silence...", percent: 60 });

      const audioCtx = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close();

      // detectSilence is imported at the top level
      const detected = detectSilence(audioBuffer, threshold, minDuration, padding);

      setRegions(detected);
      setProgress({ stage: "Done!", percent: 100 });
      setStage("editing");
    } catch (err) {
      console.error("Processing error:", err);
      alert(
        `Error processing file: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`
      );
      setStage("upload");
    }
  }, [threshold, minDuration, padding]);

  // ── Re-detect with new settings ──
  const handleRedetect = useCallback(async () => {
    if (!audioUrl) return;
    setStage("detecting");
    setProgress({ stage: "Re-analyzing with new settings...", percent: 30 });

    try {
      const audioCtx = new AudioContext();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close();

      // detectSilence is imported at the top level
      const detected = detectSilence(audioBuffer, threshold, minDuration, padding);

      setRegions(detected);
      setStage("editing");
    } catch (err) {
      console.error(err);
      setStage("editing");
    }
  }, [audioUrl, threshold, minDuration, padding]);

  // ── Process & Export ──
  const handleProcess = useCallback(async () => {
    if (!videoFile || regions.length === 0) return;

    // Check usage limit for guests
    if (!user && isGuestLimitReached()) {
      setShowAuthModal(true);
      return;
    }

    setStage("processing");
    setProgress({ stage: "Preparing video engine...", percent: 5 });

    try {
      // ffmpeg functions are imported at the top level

      const ff = await loadFFmpeg((p) => {
        setProgress({
          stage: "Processing video segments...",
          percent: 10 + p.progress * 80,
        });
      });

      // Build "keep" segments (inverse of silence regions)
      const activeRegions = regions
        .filter((r) => !r.ignored)
        .sort((a, b) => a.start - b.start);

      // Get total duration from the audio URL (approximate)
      const audioCtx = new AudioContext();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const totalDuration = audioBuffer.duration;
      await audioCtx.close();

      const keepSegments: { start: number; end: number }[] = [];
      let cursor = 0;

      for (const sil of activeRegions) {
        if (sil.start > cursor + 0.01) {
          keepSegments.push({ start: cursor, end: sil.start });
        }
        cursor = sil.end;
      }
      if (cursor < totalDuration - 0.01) {
        keepSegments.push({ start: cursor, end: totalDuration });
      }

      if (keepSegments.length === 0) {
        alert("Nothing left after removing all segments!");
        setStage("editing");
        return;
      }

      setProgress({ stage: "Cutting and joining video...", percent: 20 });
      let outputBlob: Blob;
      if (exportMode === "fast") {
        outputBlob = await cutAndConcatFast(ff, videoFile, keepSegments);
      } else {
        outputBlob = await cutAndConcatPerfect(ff, videoFile, keepSegments);
      }

      const url = URL.createObjectURL(outputBlob);
      setDownloadUrl(url);
      setStage("done");

      // Track usage
      if (user) {
        try {
          await incrementFirestoreUsage(user.uid);
        } catch (err) {
          console.warn("Could not increment Firestore usage (check DB setup):", err);
        }
      } else {
        incrementGuestUsage();
      }
    } catch (err) {
      console.error("Cut error:", err);
      alert(
        `Processing failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setStage("editing");
    }
  }, [videoFile, regions, user, audioUrl, exportMode]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setVideoFile(null);
    setAudioUrl("");
    setRegions([]);
    setDownloadUrl(null);
    setStage("upload");
  }, [downloadUrl]);

  // ── Donate Gateway ──
  const handleDonate = useCallback(async () => {
    const amountStr = window.prompt("Support AutoCut ❤️!\nEnter donation amount in INR (Minimum ₹20):", "50");
    if (!amountStr) return; // User cancelled
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 20) {
      alert("Please enter a valid amount of at least ₹20.");
      return;
    }

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate payment link.");
      }
      
      // Use Cashfree SDK to open the checkout modal
      if ((window as any).Cashfree) {
        const cashfree = (window as any).Cashfree({ mode: data.environment });
        cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_self", // Redirect back to this page after payment
        });
      } else {
        alert("Payment SDK not loaded. Please refresh the page.");
      }
    } catch (err) {
      console.error(err);
      alert(`Payment Gateway Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, []);

  return (
    <>
      <Navbar />
      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-24">
        {/* Hero */}
        {stage === "upload" && (
          <div className="mb-12 text-center">
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Remove Silence from Videos
              <span className="ml-2 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Instantly
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-slate-400">
              Upload your video, visually adjust the cuts, and download —
              all processing happens right here in your browser.
            </p>
          </div>
        )}

        {/* Upload */}
        {stage === "upload" && (
          <UploadZone onFileSelected={handleFileSelected} />
        )}

        {/* Extracting / Detecting */}
        {(stage === "extracting" || stage === "detecting") && (
          <ProcessingView
            progress={progress}
            downloadUrl={null}
            fileName=""
            onReset={handleReset}
          />
        )}

        {/* Interactive Editor */}
        {stage === "editing" && audioUrl && (
          <div className="space-y-6">
            {/* File info */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {videoFile?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {videoFile
                      ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-slate-500 transition hover:text-white"
              >
                Change file
              </button>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Silence Threshold
                  </label>
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-300">
                    {threshold} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="-10"
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Min Duration
                  </label>
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-300">
                    {minDuration.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={minDuration}
                  onChange={(e) => setMinDuration(parseFloat(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
              
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Padding (Margin)
                  </label>
                  <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                    {padding.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={padding}
                  onChange={(e) => setPadding(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Export Mode
                  </label>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      exportMode === "fast"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-green-500/15 text-green-300"
                    }`}
                  >
                    {exportMode.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 flex overflow-hidden rounded-lg border border-white/10 bg-black/50 p-1">
                  <button
                    onClick={() => setExportMode("fast")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                      exportMode === "fast"
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    FAST
                  </button>
                  <button
                    onClick={() => setExportMode("perfect")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                      exportMode === "perfect"
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    PERFECT
                  </button>
                </div>
              </div>
            </div>

            {/* Re-detect button */}
            <div className="flex justify-center">
              <button
                onClick={handleRedetect}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-violet-500/30 hover:text-violet-300"
              >
                ↻ Re-detect with new settings
              </button>
            </div>

            {/* Waveform */}
            <WaveformEditor
              audioUrl={audioUrl}
              regions={regions}
              onRegionsChange={setRegions}
            />

            {/* Action buttons */}
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={handleProcess}
                disabled={regions.filter((r) => !r.ignored).length === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                </svg>
                Remove Silence & Download
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {stage === "processing" && (
          <ProcessingView
            progress={progress}
            downloadUrl={null}
            fileName=""
            onReset={handleReset}
          />
        )}

        {/* Done */}
        {stage === "done" && (
          <ProcessingView
            progress={progress}
            downloadUrl={downloadUrl}
            fileName={
              videoFile
                ? videoFile.name.replace(/\.[^/.]+$/, "") + "_autocut.mp4"
                : "output_autocut.mp4"
            }
            onReset={handleReset}
          />
        )}

        {/* Footer info & Donate */}
        <div className="mt-16 flex flex-col items-center gap-6 pb-8">
          <button
            onClick={handleDonate}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100"></div>
            <span>Donate via Cashfree</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          
          <p className="text-xs text-slate-600">
            🔒 100% client-side processing. Your files never leave your device.
          </p>
        </div>
      </main>

    {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          handleProcess();
        }}
      />

      {/* Cashfree SDK */}
      <Script 
        src="https://sdk.cashfree.com/js/v3/cashfree.js" 
        strategy="beforeInteractive"
      />
    </>
  );
}
