#!/usr/bin/env python3
"""Measure a rendered file and write the machine part of the QC checklist.

Usage:
  python scripts/qc_report.py final.mp4 --target social [--cuts 3.2,7.85] [--loop] [--out qc/]

  --target   social | youtube | podcast | broadcast-eu | broadcast-us
  --cuts     cut times in seconds; if omitted, cuts are auto-detected
  --loop     also compare first and last frame (seamless loop films)
  --out      folder for qc-report.md and the images (default: qc/ next to the file)

It checks streams, duration match, constant frame rate, loudness and true peak on
the delivered file, and saves contact sheets for a human to look at. It does not
replace the human watch-through: the report lists what still needs eyes and ears.
Needs ffmpeg and ffprobe on PATH. Standard library only.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

# verify-first: platform targets change. Source: 03_AUDIO_ENGINEERING/loudness-and-export/loudness-targets.md
TARGETS = {
    "social": (-14.0, 1.0, -1.5),        # integrated LUFS, +/- tolerance, max true peak dBTP
    "youtube": (-14.0, 1.0, -1.0),
    "podcast": (-16.0, 1.0, -1.0),
    "broadcast-eu": (-23.0, 0.5, -1.0),
    "broadcast-us": (-24.0, 2.0, -2.0),
}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def fraction(value):
    num, _, den = value.partition("/")
    return float(num) / float(den or 1) if float(den or 1) else 0.0


def loudness(path):
    err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
               "-f", "null", "-"]).stderr
    summary = err[err.rfind("Summary:"):]
    pick = lambda pattern: float(m.group(1)) if (m := re.search(pattern, summary, re.S)) else None
    return {"I": pick(r"I:\s+(-?[\d.]+) LUFS"), "LRA": pick(r"LRA:\s+(-?[\d.]+) LU"),
            "TP": pick(r"True peak:\s+Peak:\s+(-?[\d.]+) dBFS")}


def detect_cuts(path):
    err = run(["ffmpeg", "-hide_banner", "-i", str(path), "-vf", "select='gt(scene,0.4)',showinfo",
               "-f", "null", "-"]).stderr
    return [float(t) for t in re.findall(r"pts_time:([\d.]+)", err)]


def sheet(path, out_png, start, frames, cols, fps=None):
    vf = (f"fps={fps}," if fps else "") + f"scale=240:-2,tile={cols}x{-(-frames // cols)}"
    run(["ffmpeg", "-y", "-hide_banner", "-ss", f"{max(start, 0):.3f}", "-i", str(path),
         "-frames:v", "1", "-vf", vf, str(out_png)])
    return out_png.exists()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("file")
    parser.add_argument("--target", choices=TARGETS, default="social")
    parser.add_argument("--cuts")
    parser.add_argument("--loop", action="store_true")
    parser.add_argument("--out")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        sys.exit("ffmpeg/ffprobe not found. Windows: winget install Gyan.FFmpeg, then open a new terminal.")
    src = Path(args.file)
    out = Path(args.out) if args.out else src.parent / "qc"
    out.mkdir(parents=True, exist_ok=True)
    results = []  # (status, check, detail)

    info = json.loads(run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json",
                           str(src)]).stdout or "{}")
    streams = info.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), None)
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    total = float(info.get("format", {}).get("duration", 0) or 0)

    if v:
        fps = fraction(v["avg_frame_rate"])
        cfr = abs(fraction(v["r_frame_rate"]) - fps) < 0.01 * max(fps, 1)
        results.append(("PASS" if cfr else "FAIL", "Constant frame rate", f"{fps:.3f} fps"))
        results.append(("INFO", "Video", f"{v['width']}x{v['height']} {v['codec_name']} "
                                         f"{v.get('pix_fmt')} {total:.2f}s"))
        if v.get("pix_fmt") not in ("yuv420p", None):
            results.append(("WARN", "Pixel format", f"{v.get('pix_fmt')}: many phones want yuv420p"))
    else:
        results.append(("FAIL", "Video stream", "missing"))

    if a:
        ch = a.get("channels", 0)
        results.append(("INFO", "Audio", f"{a['codec_name']} {a.get('sample_rate')}Hz {ch}ch"))
        if ch == 1:
            results.append(("WARN", "Mono audio", "deliver stereo; mono reads about 3 dB lower"))
        if v and a.get("duration") and v.get("duration"):
            gap = abs(float(a["duration"]) - float(v["duration"]))
            results.append(("PASS" if gap < 0.1 else "WARN", "Audio/video duration match", f"diff {gap:.3f}s"))
        target_i, tol, max_tp = TARGETS[args.target]
        lu = loudness(src)
        if lu["I"] is not None:
            ok = abs(lu["I"] - target_i) <= tol
            results.append(("PASS" if ok else "FAIL", f"Integrated loudness ({args.target} {target_i} LUFS)",
                            f"{lu['I']} LUFS, LRA {lu['LRA']} LU"))
        if lu["TP"] is not None:
            results.append(("PASS" if lu["TP"] <= max_tp else "FAIL", f"True peak (<= {max_tp} dBTP)",
                            f"{lu['TP']} dBTP"))
    else:
        results.append(("WARN", "Audio stream", "none (fine only for silent loops)"))

    images = []
    if v:
        if sheet(src, out / "first_2_5s.png", 0, 30, 10, fps=12):
            images.append(("First 2.5 s (mouth/chin clear? bad first frame?)", "first_2_5s.png"))
        if total > 0 and sheet(src, out / "overview.png", 0, 24, 6, fps=24 / total):
            images.append(("Whole film, 24 frames", "overview.png"))
        cuts = [float(c) for c in args.cuts.split(",")] if args.cuts else detect_cuts(src)
        results.append(("INFO", "Cuts checked", f"{len(cuts)} ({'given' if args.cuts else 'auto-detected'})"))
        rate = fraction(v["avg_frame_rate"]) or 30
        for i, t in enumerate(cuts[:40], 1):
            name = f"cut_{i:02d}_{t:07.2f}s.png"
            if sheet(src, out / name, t - 10 / rate, 20, 10):
                images.append((f"Cut {i} at {t:.2f}s (10 frames either side)", name))
        if args.loop:
            run(["ffmpeg", "-y", "-hide_banner", "-i", str(src), "-frames:v", "1", str(out / "loop_first.png")])
            run(["ffmpeg", "-y", "-hide_banner", "-sseof", "-0.05", "-i", str(src), "-frames:v", "1",
                 str(out / "loop_last.png")])
            ssim = run(["ffmpeg", "-hide_banner", "-i", str(out / "loop_first.png"), "-i",
                        str(out / "loop_last.png"), "-lavfi", "ssim", "-f", "null", "-"]).stderr
            m = re.search(r"All:([\d.]+)", ssim)
            score = float(m.group(1)) if m else 0
            results.append(("PASS" if score > 0.98 else "FAIL", "Loop seam SSIM (> 0.98)", f"{score:.4f}"))

    lines = [f"# QC report: {src.name}", "", "| Status | Check | Detail |", "|---|---|---|"]
    lines += [f"| {s} | {c} | {d} |" for s, c, d in results]
    lines += ["", "## Look at these images", ""] + [f"- {label}: `{name}`" for label, name in images]
    lines += ["", "## Still needs a human (not measurable here)", "",
              "- [ ] Every word whole at every cut (listen, do not trust a transcript)",
              "- [ ] Captions: every word matches speech; names and numbers checked; never over the mouth",
              "- [ ] Caption contrast behind every chunk on bright shots",
              "- [ ] Lip sync holds, including the last 10 seconds",
              "- [ ] SFX tied to visible actions; music ducks under speech",
              "- [ ] Played start to end on a phone"]
    report = "\n".join(lines) + "\n"
    (out / "qc-report.md").write_text(report, encoding="utf-8")
    print(report)
    print(f"Saved to {out}")
    sys.exit(1 if any(s == "FAIL" for s, _, _ in results) else 0)


if __name__ == "__main__":
    main()
