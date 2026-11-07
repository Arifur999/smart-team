#!/usr/bin/env python3
"""Inventory project materials so the intake does not ask what can be measured.

Usage:
  python scripts/probe_assets.py <file-or-folder> [more paths...] [--scenes] [--out inventory.md]

  --scenes   also detect cuts in video files (use on reference clips to measure
             shot count, average shot length and cuts per 10 s)
  --out      write the markdown report to a file as well as printing it

Needs ffprobe (and ffmpeg for --scenes) on PATH. Standard library only.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

VIDEO = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mxf"}
AUDIO = {".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".aif", ".aiff"}
IMAGE = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".psd", ".tif", ".tiff"}
FONT = {".ttf", ".otf", ".woff", ".woff2"}
TEXT = {".txt", ".md", ".docx", ".pdf", ".srt", ".vtt", ".json", ".csv"}
HDR_TRANSFERS = {"smpte2084", "arib-std-b67"}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def fraction(value):
    try:
        num, _, den = value.partition("/")
        return float(num) / float(den or 1)
    except (ValueError, ZeroDivisionError):
        return 0.0


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)])
    if out.returncode != 0:
        return None
    return json.loads(out.stdout or "{}")


def detect_cuts(path, threshold=0.4):
    out = run(["ffmpeg", "-hide_banner", "-i", str(path), "-vf",
               f"select='gt(scene,{threshold})',showinfo", "-f", "null", "-"])
    return [float(t) for t in re.findall(r"pts_time:([\d.]+)", out.stderr)]


def describe_media(path, want_scenes):
    data = probe(path)
    if data is None:
        return {"info": "ffprobe could not read it", "flags": ["UNREADABLE"]}
    duration = float(data.get("format", {}).get("duration", 0) or 0)
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"
              and s.get("disposition", {}).get("attached_pic", 0) == 0), None)
    a = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    parts, flags = [f"{duration:.2f}s"], []

    if v:
        w, h = v.get("width", 0), v.get("height", 0)
        rotation = 0
        for side in v.get("side_data_list", []) or []:
            rotation = int(side.get("rotation", rotation) or rotation)
        if abs(rotation) in (90, 270):
            w, h = h, w
        r, avg = fraction(v.get("r_frame_rate", "0/1")), fraction(v.get("avg_frame_rate", "0/1"))
        parts.append(f"{w}x{h} {v.get('codec_name')} {avg:.3f}fps {v.get('pix_fmt', '')}")
        if r and avg and abs(r - avg) / r > 0.01:
            flags.append("VFR (convert to constant frame rate before editing)")
        if v.get("color_transfer") in HDR_TRANSFERS:
            flags.append("HDR (tone-map to SDR Rec.709 for social)")
        if min(w, h) < 1080:
            flags.append(f"low resolution ({min(w, h)}p short side)")
        parts.append("vertical" if h > w else "square" if h == w else "landscape")
    if a:
        ch, sr = a.get("channels", 0), int(a.get("sample_rate", 0) or 0)
        parts.append(f"audio {a.get('codec_name')} {sr}Hz {ch}ch")
        if ch == 1:
            flags.append("mono audio (measure loudness on the stereo deliverable)")
        if sr and sr != 48000:
            flags.append(f"{sr}Hz audio (video standard is 48 kHz)")
    elif v:
        flags.append("no audio track")

    if want_scenes and v and duration > 0:
        cuts = detect_cuts(path)
        shots = len(cuts) + 1
        parts.append(f"{shots} shots, avg {duration / shots:.2f}s, "
                     f"{len(cuts) / duration * 10:.1f} cuts/10s, "
                     f"first cut {cuts[0]:.2f}s" if cuts else "1 shot (no cuts found)")
    return {"info": ", ".join(parts), "flags": flags}


def collect(paths):
    files = []
    for p in map(Path, paths):
        if p.is_dir():
            files += sorted(f for f in p.rglob("*") if f.is_file())
        elif p.is_file():
            files.append(p)
        else:
            print(f"NOT FOUND: {p}", file=sys.stderr)
    return files


def kind_of(path):
    ext = path.suffix.lower()
    for name, group in (("video", VIDEO), ("audio", AUDIO), ("image", IMAGE),
                        ("font", FONT), ("text", TEXT)):
        if ext in group:
            return name
    return "other"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--scenes", action="store_true")
    parser.add_argument("--out")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    have_ffprobe = shutil.which("ffprobe") is not None
    rows, counts = [], {}
    for f in collect(args.paths):
        kind = kind_of(f)
        counts[kind] = counts.get(kind, 0) + 1
        size = f"{f.stat().st_size / 1_048_576:.1f} MB"
        if kind in ("video", "audio") and have_ffprobe:
            d = describe_media(f, args.scenes)
        else:
            d = {"info": "", "flags": []}
        rows.append((kind, str(f), size, d["info"], "; ".join(d["flags"])))

    lines = ["# Asset inventory", ""]
    if not have_ffprobe:
        lines += ["> ffprobe not found on PATH, so media was listed but not measured.",
                  "> Windows: `winget install Gyan.FFmpeg`, then open a new terminal.", ""]
    lines.append("Counts: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    lines += ["", "| Kind | File | Size | Measured | Flags |", "|---|---|---|---|---|"]
    lines += [f"| {k} | {p} | {s} | {i} | {fl} |" for k, p, s, i, fl in rows]
    report = "\n".join(lines) + "\n"
    print(report)
    if args.out:
        Path(args.out).write_text(report, encoding="utf-8")


if __name__ == "__main__":
    main()
