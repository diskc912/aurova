"use client";

import { useEffect, useRef, useState } from "react";

interface FilmstripTimelineProps {
  videoFile: File | null;
  duration: number; // total audio duration in seconds
  zoom: number; // current zoom level (px per second)
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const STRIP_HEIGHT = 52; // px
const FRAME_WIDTH = 80; // px per thumbnail

export default function FilmstripTimeline({
  videoFile,
  duration,
  zoom,
  scrollContainerRef,
}: FilmstripTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [totalWidth, setTotalWidth] = useState(800);

  // Total strip width matches waveform width (zoom * duration)
  useEffect(() => {
    setTotalWidth(Math.max(800, zoom * duration));
  }, [zoom, duration]);

  // Create/update hidden video element when file changes
  useEffect(() => {
    // Cleanup previous URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!videoFile) {
      videoRef.current = null;
      return;
    }

    const url = URL.createObjectURL(videoFile);
    objectUrlRef.current = url;
    const vid = document.createElement("video");
    vid.src = url;
    vid.muted = true;
    vid.preload = "metadata";
    vid.style.display = "none";
    vid.playsInline = true;
    document.body.appendChild(vid);
    videoRef.current = vid;

    return () => {
      vid.remove();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [videoFile]);

  // Draw frames onto canvas whenever totalWidth or duration changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const vid = videoRef.current;
    if (!canvas || !vid || duration <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = totalWidth;
    canvas.height = STRIP_HEIGHT;

    // Fill background
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, totalWidth, STRIP_HEIGHT);

    const frameCount = Math.ceil(totalWidth / FRAME_WIDTH);
    const interval = duration / frameCount;

    let frameIndex = 0;
    let aborted = false;

    const drawNextFrame = () => {
      if (aborted || frameIndex >= frameCount) return;

      vid.currentTime = frameIndex * interval;
    };

    const onSeeked = () => {
      if (aborted) return;
      const canvas2 = canvasRef.current;
      const ctx2 = canvas2?.getContext("2d");
      if (!canvas2 || !ctx2) return;

      const x = frameIndex * FRAME_WIDTH;
      const vidW = vid.videoWidth || 160;
      const vidH = vid.videoHeight || 90;
      const aspectRatio = vidW / vidH;
      const drawH = STRIP_HEIGHT;
      const drawW = drawH * aspectRatio;
      // Center crop if wider than slot
      const destX = x + (FRAME_WIDTH - Math.min(drawW, FRAME_WIDTH)) / 2;

      try {
        ctx2.drawImage(vid, destX, 0, Math.min(drawW, FRAME_WIDTH), drawH);
      } catch {
        // cross-origin or decode error — skip
      }

      // Draw subtle divider
      ctx2.strokeStyle = "rgba(0,0,0,0.6)";
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(x, 0);
      ctx2.lineTo(x, STRIP_HEIGHT);
      ctx2.stroke();

      // Draw timestamp label
      const t = frameIndex * interval;
      const minutes = Math.floor(t / 60);
      const seconds = String(Math.floor(t % 60)).padStart(2, "0");
      const label = `${minutes}:${seconds}`;
      ctx2.fillStyle = "rgba(255,255,255,0.75)";
      ctx2.font = "bold 9px monospace";
      ctx2.fillText(label, x + 4, 11);

      frameIndex++;
      drawNextFrame();
    };

    vid.addEventListener("seeked", onSeeked);

    // Start drawing once metadata is loaded
    const start = () => {
      if (!aborted) drawNextFrame();
    };

    if (vid.readyState >= 1) {
      start();
    } else {
      vid.addEventListener("loadedmetadata", start, { once: true });
    }

    return () => {
      aborted = true;
      vid.removeEventListener("seeked", onSeeked);
    };
  }, [totalWidth, duration, videoFile]);

  if (!videoFile || duration <= 0) return null;

  return (
    <div
      className="filmstrip-wrapper"
      style={{
        overflowX: "hidden",
        overflowY: "hidden",
        height: STRIP_HEIGHT,
        borderRadius: "8px 8px 0 0",
        border: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "none",
        background: "#111",
        position: "relative",
      }}
    >
      <canvas
        ref={canvasRef}
        height={STRIP_HEIGHT}
        style={{
          display: "block",
          height: STRIP_HEIGHT,
          width: totalWidth,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
