"""Read a reference video A to Z and write everything the team needs to describe it with numbers.

Usage:  python analyze_reference.py <reference.mp4> --out 01-source [--sheet-fps 5]

Writes into --out (the original file is never touched; the script works on a copy):
  ref.mp4                 copy of the reference (what the Review Booth plays side by side)
  probe.json              ffprobe of the file
  luma.tsv                10 Hz: time, average luma, 98th-percentile luma, lit share, mid-tone share
  events.json             motion-graphics events (scene >= 0.08), hard cuts (>= 0.4), black and frozen spans
  audio.json              loudness summary and 100 ms momentary loudness (when there is sound)
  reference-sheet.png     contact sheet: a frame every 0.2 s with its timecode (more sheets if long)
  strips/E##_<t>.png      0.8 s around every event at 10 fps, so you can see how it moves
  reference-frames/*.png  full-size frame 0.1 s after every event and one mid-beat frame per beat
  beats.draft.json        beats between events with luma, colour and an empty flag; edit into beat-map.json
  summary.md              the timeline in words, to read before you open the images

Then OPEN every sheet, strip and frame with the Read tool. The numbers say when; only the frames say what.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import ffkit as ff

EVENT = 0.08
CUT = 0.4
MERGE = 0.15


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("reference")
    ap.add_argument("--out", required=True)
    ap.add_argument("--sheet-fps", type=float, default=5)
    a = ap.parse_args()

    src = Path(a.reference)
    if not src.is_file():
        ff.fail(f"{src} not found")
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    ref = out / "ref.mp4"
    if src.resolve() != ref.resolve():
        shutil.copyfile(src, ref)

    (out / "probe.json").write_text(json.dumps(ff.probe(ref), indent=2), encoding="utf-8")
    vi = ff.info(ref)
    dur = vi.duration
    print(f"reference: {vi.width}x{vi.height} {vi.fps} fps {dur:.2f} s audio={vi.has_audio}")

    # Luma envelope at 10 Hz.
    _, _, frames = ff.gray_frames(ref, fps=10, width=160)
    luma = [dict(t=round(i / 10, 2), **ff.luma_stats(f)) for i, f in enumerate(frames)]
    with open(out / "luma.tsv", "w", encoding="utf-8") as fh:
        fh.write("t\tyavg\typ98\tymax\tlit\tmid_share\n")
        for r in luma:
            fh.write(f"{r['t']}\t{r['yavg']}\t{r['yp98']}\t{r['ymax']}\t{r['lit']}\t{r['mid_share']}\n")

    # Events: every frame's scene score, merged so one move is one event.
    scores = ff.scene_scores(ref, out)
    raw = [(t, s) for t, s in scores if s >= EVENT and t > 0.05]
    events: list[dict] = []
    for t, s in raw:
        if events and t - events[-1]["t"] < MERGE:
            if s > events[-1]["score"]:
                events[-1].update(t=round(t, 3), score=round(s, 3))
            continue
        events.append({"t": round(t, 3), "score": round(s, 3)})
    for e in events:
        e["kind"] = "cut" if e["score"] >= CUT else "event"
    bf = ff.black_and_freeze(ref)
    (out / "events.json").write_text(json.dumps({"duration": dur, "events": events, **bf}, indent=2), encoding="utf-8")
    print(f"events: {len(events)} ({sum(e['kind'] == 'cut' for e in events)} hard cuts), black spans {len(bf['black'])}, freezes {len(bf['freezes'])}")

    loud = ff.loudness(ref)
    if loud:
        (out / "audio.json").write_text(json.dumps(loud, indent=1), encoding="utf-8")

    # Contact sheet(s): a frame every 1/sheet_fps s with its timecode.
    font = ff.font_args()
    tiles = 64
    per_sheet = tiles / a.sheet_fps
    sheets = []
    n = 0
    start = 0.0
    while start < dur:
        n += 1
        name = "reference-sheet.png" if n == 1 else f"reference-sheet-{n:02d}.png"
        vf = (
            f"fps={a.sheet_fps},scale=320:-2,"
            f"drawtext={font}text='%{{pts\\:hms}}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,"
            f"tile=8x8:padding=4:color=0x202020"
        )
        ff.run([ff.FFMPEG, "-v", "error", "-y", "-ss", f"{start:.3f}", "-t", f"{per_sheet:.3f}", "-i", "ref.mp4", "-vf", vf, "-frames:v", "1", "-copyts", name], cwd=out)
        sheets.append(name)
        start += per_sheet

    # Strips around each event, and full-size frames.
    (out / "strips").mkdir(exist_ok=True)
    frames_dir = out / "reference-frames"
    frames_dir.mkdir(exist_ok=True)
    for i, e in enumerate(events, 1):
        t0 = max(0.0, e["t"] - 0.4)
        name = f"strips/E{i:02d}_{e['t']:.2f}.png"
        vf = f"fps=10,scale=240:-2,drawtext={font}text='%{{pts\\:hms}}':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6,tile=8x1:padding=2"
        ff.run([ff.FFMPEG, "-v", "error", "-y", "-ss", f"{t0:.3f}", "-t", "0.8", "-i", "ref.mp4", "-vf", vf, "-frames:v", "1", "-copyts", name], cwd=out)
        ff.frame_png(ref, min(dur - 0.04, e["t"] + 0.1), frames_dir / f"E{i:02d}_{e['t'] + 0.1:.2f}.png")

    # Beats: spans between events (and the start/end). Each gets a mid frame, its luma and a 16x9 colour read.
    bounds = [0.0] + [e["t"] for e in events] + [dur]
    beats = []
    for i in range(len(bounds) - 1):
        s, e = bounds[i], bounds[i + 1]
        if e - s < 0.08:
            continue
        mid = round((s + e) / 2, 2)
        span = [r for r in luma if s <= r["t"] < e] or [min(luma, key=lambda r: abs(r["t"] - mid))]
        rgb = ff.rgb_frame(ref, mid, 16, 9)
        cells = [tuple(rgb[j : j + 3]) for j in range(0, len(rgb) - 2, 3)]
        bright = max(cells, key=sum) if cells else (0, 0, 0)
        dark = min(cells, key=sum) if cells else (0, 0, 0)
        empty = max(r["lit"] for r in span) < 0.001
        name = f"B{len(beats) + 1:02d}_mid_{mid:.2f}.png"
        ff.frame_png(ref, mid, frames_dir / name)
        beats.append(
            {
                "id": f"B{len(beats) + 1:02d}",
                "name": "",
                "start": round(s, 2),
                "end": round(e, 2),
                "poster": mid,
                "starts_with": next((ev["kind"] for ev in events if abs(ev["t"] - s) < 0.01), "start"),
                "luma_avg": round(sum(r["yavg"] for r in span) / len(span), 1),
                "luma_peak": max(r["yp98"] for r in span),
                "mid_tone_share": round(sum(r["mid_share"] for r in span) / len(span), 3),
                "empty": empty,
                "brightest": ff.hexcolor(bright),
                "darkest": ff.hexcolor(dark),
                "frame": f"reference-frames/{name}",
                "what_moves": "",
                "ease": "",
                "transition_in": "",
                "sound": "",
                "text": "",
            }
        )
    (out / "beats.draft.json").write_text(json.dumps({"duration": dur, "size": f"{vi.width}x{vi.height}", "fps": vi.fps, "beats": beats}, indent=2), encoding="utf-8")

    # Human summary.
    lines = [f"# Reference timeline\n", f"{vi.width}x{vi.height}, {vi.fps} fps, {dur:.2f} s, sound: {'yes' if vi.has_audio else 'no'}\n"]
    if loud:
        lines.append(f"Loudness: {loud['integrated_lufs']} LUFS, true peak {loud['true_peak_dbtp']} dBTP\n")
    # "Something is there" = at least 0.1% of pixels lit. Small lamps on black count; blackdetect would call them black.
    first_lit = next((r["t"] for r in luma if r["lit"] >= 0.001), None)
    lines.append(f"First visible content (0.1% of pixels lit): {first_lit} s\n")
    span_start = None
    for r in luma + [{"t": round(dur, 2), "lit": 1.0}]:
        if r["lit"] < 0.001 and span_start is None:
            span_start = r["t"]
        elif r["lit"] >= 0.001 and span_start is not None:
            if r["t"] - span_start >= 0.1:
                lines.append(f"- empty (nothing lit) {span_start:.2f}-{r['t']:.2f} s")
            span_start = None
    for b in bf["black"]:
        lines.append(f"- dark by blackdetect (may hold small lights) {b['start']:.2f}-{b['end']:.2f} s")
    for f in bf["freezes"]:
        lines.append(f"- frozen from {f['start']:.2f} s for {f['duration'] or 0:.2f} s")
    lines.append("\n| beat | start | end | starts with | luma avg/peak | mid-tone share | brightest | empty |\n|---|---|---|---|---|---|---|---|")
    for b in beats:
        lines.append(f"| {b['id']} | {b['start']} | {b['end']} | {b['starts_with']} | {b['luma_avg']}/{b['luma_peak']} | {b['mid_tone_share']} | {b['brightest']} | {'yes' if b['empty'] else ''} |")
    lines.append("\nImages to open, every one: " + ", ".join(sheets) + f", strips/ ({len(events)}), reference-frames/ ({len(events) + len(beats)})")
    (out / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"beats: {len(beats)}; wrote {out / 'summary.md'}")


if __name__ == "__main__":
    main()
