"""Small ffmpeg helpers shared by the video skills' scripts. Standard library only.

ffmpeg and ffprobe are called with argument lists (never a shell string). Filters that write files run
with the output folder as the working directory and relative names, so Windows drive letters never
have to be escaped inside a filter graph.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import statistics
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"


def run(args: list[str], cwd: str | Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    proc = subprocess.run(args, cwd=cwd, capture_output=True)
    if check and proc.returncode != 0:
        tail = proc.stderr.decode("utf-8", "replace")[-1500:]
        raise RuntimeError(f"{Path(args[0]).name} failed ({proc.returncode}): {tail}")
    return proc


def probe(path: str | Path) -> dict:
    out = run([FFPROBE, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]).stdout
    return json.loads(out)


@dataclass
class VideoInfo:
    width: int
    height: int
    fps: float
    duration: float
    has_audio: bool
    codec: str
    pix_fmt: str


def info(path: str | Path) -> VideoInfo:
    p = probe(path)
    v = next(s for s in p["streams"] if s.get("codec_type") == "video")
    num, _, den = (v.get("avg_frame_rate") or v.get("r_frame_rate") or "25/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 25.0
    duration = float(p["format"].get("duration") or v.get("duration") or 0)
    return VideoInfo(
        width=int(v["width"]),
        height=int(v["height"]),
        fps=round(fps, 3) or 25.0,
        duration=duration,
        has_audio=any(s.get("codec_type") == "audio" for s in p["streams"]),
        codec=v.get("codec_name", ""),
        pix_fmt=v.get("pix_fmt", ""),
    )


def gray_frames(path: str | Path, fps: float = 10, width: int = 160) -> tuple[int, int, list[bytes]]:
    """Every 1/fps seconds, a small grayscale frame (bytes, one per pixel)."""
    vi = info(path)
    height = max(2, round(vi.height * width / vi.width / 2) * 2)
    raw = run([FFMPEG, "-v", "error", "-i", str(path), "-vf", f"fps={fps},scale={width}:{height}:flags=area,format=gray", "-f", "rawvideo", "-"]).stdout
    size = width * height
    return width, height, [raw[i : i + size] for i in range(0, len(raw) - size + 1, size)]


def rgb_frame(path: str | Path, t: float, width: int, height: int) -> bytes:
    """One frame at t, scaled to width x height, as rgb24 bytes."""
    return run([FFMPEG, "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", "-vf", f"scale={width}:{height}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]).stdout


def frame_png(path: str | Path, t: float, out: str | Path, vf: str | None = None) -> Path:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    args = [FFMPEG, "-v", "error", "-y", "-ss", f"{max(0.0, t):.3f}", "-i", str(path), "-frames:v", "1"]
    if vf:
        args += ["-vf", vf]
    run(args + [str(out)])
    return out


def luma_stats(frame: bytes) -> dict:
    vals = frame
    n = len(vals)
    mean = sum(vals) / n
    hist = [0] * 256
    for b in vals:
        hist[b] += 1
    # 98th percentile is a steadier "is anything lit" signal than the single brightest pixel.
    acc, p98 = 0, 0
    for level in range(256):
        acc += hist[level]
        if acc >= n * 0.98:
            p98 = level
            break
    ymax = max(level for level in range(256) if hist[level])
    lit = n - sum(hist[:40])
    mid = sum(hist[40:201])
    return {"yavg": round(mean, 2), "yp98": p98, "ymax": ymax, "lit": round(lit / n, 4), "mid_share": round(mid / lit, 4) if lit else 0.0}


def scene_scores(path: str | Path, workdir: Path) -> list[tuple[float, float]]:
    """(time, scene score 0..1) for every frame."""
    name = "_scene.txt"
    run([FFMPEG, "-v", "error", "-y", "-i", str(Path(path).resolve()), "-vf", f"select='gte(scene,0)',metadata=print:file={name}", "-an", "-f", "null", "-"], cwd=workdir)
    text = (workdir / name).read_text(encoding="utf-8", errors="replace")
    (workdir / name).unlink(missing_ok=True)
    out, t = [], None
    for line in text.splitlines():
        m = re.search(r"pts_time:([\d.]+)", line)
        if m:
            t = float(m.group(1))
            continue
        m = re.search(r"lavfi\.scene_score=([\d.]+)", line)
        if m and t is not None:
            out.append((t, float(m.group(1))))
    return out


def black_and_freeze(path: str | Path) -> dict:
    err = run([FFMPEG, "-v", "info", "-i", str(path), "-vf", "blackdetect=d=0.1:pic_th=0.98:pix_th=0.10,freezedetect=n=-60dB:d=0.5", "-an", "-f", "null", "-"]).stderr.decode("utf-8", "replace")
    black = [{"start": float(a), "end": float(b), "duration": float(c)} for a, b, c in re.findall(r"black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)", err)]
    starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", err)]
    durs = [float(x) for x in re.findall(r"freeze_duration: ([\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", err)]
    freezes = []
    for i, s in enumerate(starts):
        d = durs[i] if i < len(durs) else None
        e = ends[i] if i < len(ends) else None
        freezes.append({"start": s, "end": e, "duration": d if d is not None else (e - s if e else None)})
    return {"black": black, "freezes": freezes}


def loudness(path: str | Path) -> dict | None:
    if not info(path).has_audio:
        return None
    err = run([FFMPEG, "-v", "info", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.decode("utf-8", "replace")
    momentary = [(float(t), float(m)) for t, m in re.findall(r"t:\s*([\d.]+)\s+TARGET:[^M]*M:\s*(-?[\d.]+)", err)]
    summary = err[err.rfind("Summary:") :] if "Summary:" in err else ""

    def grab(label: str) -> float | None:
        m = re.search(label + r":\s*(-?[\d.]+)", summary)
        return float(m.group(1)) if m else None

    return {"integrated_lufs": grab("I"), "lra": grab("LRA"), "true_peak_dbtp": grab("Peak"), "momentary": momentary}


def font_args() -> str:
    """drawtext fontfile option that works on Windows (escaped drive colon) and elsewhere."""
    candidates = ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", "/System/Library/Fonts/Menlo.ttc"]
    for c in candidates:
        if os.path.exists(c):
            return "fontfile='" + c.replace(":", "\\:") + "':"
    return ""


def pearson(a: list[float], b: list[float]) -> float | None:
    n = min(len(a), len(b))
    if n < 3:
        return None
    a, b = a[:n], b[:n]
    try:
        return round(statistics.correlation(a, b), 3)
    except statistics.StatisticsError:
        return None


def hexcolor(rgb: tuple[int, int, int]) -> str:
    return "#%02X%02X%02X" % rgb


def fail(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(2)
