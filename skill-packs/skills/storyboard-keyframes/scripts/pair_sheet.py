"""Pair every style frame with the reference frame it must match, so you judge look, not memory.

Usage:  python pair_sheet.py --stills 03-storyboard/v1/stills --ref 01-source/ref.mp4 --out 03-storyboard/v1
                             [--beat-plan 02-plan/beat-plan.json]

Still names carry their time: F03_t4.20.png means render time 4.20 s. The reference time comes from
beat-plan.json (the beat whose render window holds that time, at the same share of the beat), or the
same time when there is no plan. Writes pairs/<still>.png (still | reference), sheet.png (all pairs)
and phone-sheet.png (stills at 360 px wide, to check legibility on a phone).
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import ffkit as ff


def ref_time(t: float, plan: list[dict]) -> float:
    for b in plan:
        r, f = b.get("render"), b.get("ref") or b.get("reference")
        if isinstance(r, list) and isinstance(f, list) and r[0] <= t <= r[1] and r[1] > r[0]:
            return f[0] + (f[1] - f[0]) * (t - r[0]) / (r[1] - r[0])
    return t


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--stills", required=True)
    ap.add_argument("--ref", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--beat-plan")
    a = ap.parse_args()

    plan = []
    if a.beat_plan and Path(a.beat_plan).is_file():
        data = json.loads(Path(a.beat_plan).read_text(encoding="utf-8"))
        plan = data.get("beats", data if isinstance(data, list) else [])
    stills = sorted(p for p in Path(a.stills).glob("*.png") if re.search(r"t\d", p.stem))
    if not stills:
        ff.fail(f"no stills named like F01_t2.40.png in {a.stills}")
    out = Path(a.out)
    (out / "pairs").mkdir(parents=True, exist_ok=True)
    font = ff.font_args()
    made = []
    for s in stills:
        t = float(re.search(r"t(\d+(?:\.\d+)?)", s.stem).group(1))
        ft = round(ref_time(t, plan), 2)
        name = f"pairs/{s.stem}.png"
        lab = lambda txt: f"drawtext={font}text='{txt}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6"  # noqa: E731
        fc = f"[0:v]scale=-2:360,setsar=1,{lab(s.stem)}[a];[1:v]scale=-2:360,setsar=1,{lab(f'reference {ft:.2f}s')}[b];[a][b]hstack=inputs=2"
        ff.run([ff.FFMPEG, "-v", "error", "-y", "-i", str(s), "-ss", f"{ft:.3f}", "-i", str(a.ref), "-filter_complex", fc, "-frames:v", "1", str(out / name)])
        made.append(name)
    inputs = sum((["-i", m] for m in made), [])
    ff.run([ff.FFMPEG, "-v", "error", "-y", *inputs, "-filter_complex", f"vstack=inputs={len(made)}" if len(made) > 1 else "null", "sheet.png"], cwd=out)
    phone = sum((["-i", str(s.resolve())] for s in stills), [])
    scaled = "".join(f"[{i}:v]scale=360:-2,setsar=1[s{i}];" for i in range(len(stills)))
    ff.run([ff.FFMPEG, "-v", "error", "-y", *phone, "-filter_complex", scaled + "".join(f"[s{i}]" for i in range(len(stills))) + (f"hstack=inputs={len(stills)}" if len(stills) > 1 else "null"), "phone-sheet.png"], cwd=out)
    print(f"{len(made)} pairs; open {out / 'sheet.png'}, every pairs/*.png and phone-sheet.png")


if __name__ == "__main__":
    main()
