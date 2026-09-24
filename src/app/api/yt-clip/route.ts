import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const runtime = "nodejs";

const run = promisify(execFile);
const MAX_CLIP_SECONDS = 10 * 60;
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"]);

function validate(url: string | null, start: number, end: number): string | null {
  let host = "";
  try { host = new URL(url ?? "").hostname; } catch {}
  if (!YT_HOSTS.has(host)) return "Please paste a valid YouTube link.";
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return "End time must be after start time.";
  if (end - start > MAX_CLIP_SECONDS) return `Clips can be at most ${MAX_CLIP_SECONDS / 60} minutes.`;
  return null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const url = q.get("url");
  const start = Number(q.get("start"));
  const end = Number(q.get("end"));

  const error = validate(url, start, end);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const dir = await mkdtemp(path.join(tmpdir(), "ytclip-"));
  try {
    // execFile (no shell) + "--" so the URL can never be parsed as a flag.
    // HD needs the bgutil-ytdlp-pot-provider plugin; its HTTP server on :4416 makes it ~10s faster.
    const args = (attempt: number) => [
      "-S", "vcodec:h264,res:1080,acodec:m4a",
      // Fetch in 10MB ranges; otherwise ffmpeg drains the whole file to seek and YouTube throttles it.
      "--downloader-args", "ffmpeg_i:-request_size 10485760",
      // Exact cuts need a re-encode; veryfast is ~2x quicker than the default preset.
      "--downloader-args", "ffmpeg_o:-c:v libx264 -preset veryfast -crf 20",
      "--merge-output-format", "mp4",
      "--download-sections", `*${start}-${end}`,
      "--force-keyframes-at-cuts",
      "--no-playlist",
      "--print", "after_move:filepath",
      "-o", path.join(dir, `clip${attempt}.%(ext)s`),
      "--", url!,
    ];
    const ytdlp = process.env.YTDLP_PATH || "yt-dlp";
    // YouTube randomly 403s now and then; one retry hides it.
    const { stdout } = await run(ytdlp, args(1), { timeout: 5 * 60_000 })
      .catch(() => run(ytdlp, args(2), { timeout: 5 * 60_000 }));

    const file = stdout.trim().split(/\r?\n/).pop()!;
    // ponytail: buffers whole clip in memory; stream from disk if clips get big
    const data = await readFile(file);

    return new NextResponse(data, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="clip_${Math.floor(start)}-${Math.floor(end)}${path.extname(file)}"`,
      },
    });
  } catch (e) {
    console.error("yt-clip failed:", e);
    return NextResponse.json({ error: "Could not download that clip. Check the link and try again." }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
