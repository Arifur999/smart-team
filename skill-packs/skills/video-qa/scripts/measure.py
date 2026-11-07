"""Measure a render against its reference so the critic judges with evidence, not taste.

Usage:
  python measure.py --render 04-renders/v2/film.mp4 --ref 01-source/ref.mp4 --out critique/v2
                    [--beat-plan 02-plan/beat-plan.json] [--stills 03-storyboard/v2/stills] [--project build]

Writes into --out:
  metrics.json        every number below, for the verdict
  report.md           the same in words, with the flags first
  pairs/P##_<t>.png   render | reference side by side at matched beat times (labelled)
  pairs-sheet.png     all pairs in one image; phone-sheet.png the render alone at 360 px wide
  safe/S##_<t>.png    render frames with the 90% action-safe and 80% title-safe boxes drawn
  edges/E##_<t>.png   frames where something lit touches the frame edge (possible cut-off)

Matched times come from beat-plan.json ("beats": [{"id","render":[start,end],"ref":[start,end],"poster"}]) when
given; otherwise ten points spread over both films by their share of the duration.
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import subprocess
from pathlib import Path

import ffkit as ff


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--render", required=True)
    ap.add_argument("--ref", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--beat-plan")
    ap.add_argument("--stills", help="style frames named with their time, e.g. F03_t4.20.png")
    ap.add_argument("--project", help="HyperFrames project folder, for hyperframes check and code smells")
    a = ap.parse_args()

    render, ref, out = Path(a.render), Path(a.ref), Path(a.out)
    for p in (render, ref):
        if not p.is_file():
            ff.fail(f"{p} not found")
    out.mkdir(parents=True, exist_ok=True)
    ri, fi = ff.info(render), ff.info(ref)
    m: dict = {"render": str(render), "reference": str(ref)}
    m["spec"] = {
        "render": {"size": f"{ri.width}x{ri.height}", "fps": ri.fps, "duration": round(ri.duration, 3), "codec": ri.codec, "pix_fmt": ri.pix_fmt, "audio": ri.has_audio},
        "reference": {"size": f"{fi.width}x{fi.height}", "fps": fi.fps, "duration": round(fi.duration, 3)},
        "aspect_matches": abs(ri.width / ri.height - fi.width / fi.height) < 0.01,
        "browser_safe": ri.codec == "h264" and ri.pix_fmt == "yuv420p",
    }

    # Luma envelopes at 10 Hz; correlation over each film's own timeline scaled to the shorter one.
    _, _, rframes = ff.gray_frames(render, 10, 160)
    _, _, fframes = ff.gray_frames(ref, 10, 160)
    rl = [ff.luma_stats(f) for f in rframes]
    fl = [ff.luma_stats(f) for f in fframes]
    m["luma"] = {
        "r_same_time": ff.pearson([x["yavg"] for x in rl], [x["yavg"] for x in fl]),
        "render_first_content": next((i / 10 for i, x in enumerate(rl) if x["lit"] >= 0.001), None),
        "reference_first_content": next((i / 10 for i, x in enumerate(fl) if x["lit"] >= 0.001), None),
    }
    # Glow: soft light has many mid-tones among its lit pixels; flat hard shapes are mostly full white.
    def glow(xs: list[dict]) -> float | None:
        lit = [x["mid_share"] for x in xs if x["lit"] >= 0.02]
        return round(statistics.mean(lit), 3) if lit else None

    gr, gf = glow(rl), glow(fl)

    def cover(xs: list[dict]) -> float | None:
        lit = [x["lit"] for x in xs if x["lit"] >= 0.02 and x["lit"] < 0.9]
        return round(statistics.mean(lit), 3) if lit else None

    m["glow"] = {
        "render": gr,
        "reference": gf,
        "ratio": round(gr / gf, 2) if gr and gf else None,
        "note": "below 0.6: hard flat light; above 1.8: washed-out haze with no defined beam",
        "lit_cover_render": cover(rl),
        "lit_cover_reference": cover(fl),
    }

    # Empty, black and frozen spans in the render.
    empty, start = [], None
    for i, x in enumerate(rl + [{"lit": 1}]):
        t = i / 10
        if x["lit"] < 0.001 and start is None:
            start = t
        elif x["lit"] >= 0.001 and start is not None:
            if t - start >= 0.2:
                empty.append({"start": round(start, 2), "end": round(t, 2)})
            start = None
    bf = ff.black_and_freeze(render)
    m["empty"] = empty
    m["black"] = bf["black"]
    m["freezes"] = bf["freezes"]
    m["long_freezes"] = [f for f in bf["freezes"] if (f["duration"] or 0) >= 1.0]

    # Events and beat timing.
    rev = merge_events(ff.scene_scores(render, out))
    fev = merge_events(ff.scene_scores(ref, out))
    m["events"] = {"render": rev, "reference": fev}
    scale = ri.duration / fi.duration if fi.duration else 1
    errors, missed = [], []
    for t in fev:
        target = t * scale
        nearest = min(rev, key=lambda r: abs(r - target)) if rev else None
        if nearest is not None and abs(nearest - target) <= 0.5:
            errors.append(round(abs(nearest - target) * ri.fps))
        else:
            missed.append(round(target, 2))
    m["beat_error_frames"] = {
        "median": statistics.median(errors) if errors else None,
        "max": max(errors) if errors else None,
        "each": errors,
        "missed_reference_events": missed,
        "note": "reference events scaled to the render's length; a render event within 0.5 s counts as a hit",
    }

    # Matched times.
    pairs = matched_times(a.beat_plan, ri.duration, fi.duration)
    (out / "pairs").mkdir(exist_ok=True)
    (out / "safe").mkdir(exist_ok=True)
    h = 360
    pair_files = []
    for i, (label, rt, ft) in enumerate(pairs, 1):
        name = f"pairs/P{i:02d}_{rt:.2f}.png"
        pair_image(render, rt, ref, ft, out / name, h, f"render {rt:.2f}s {label}", f"reference {ft:.2f}s")
        pair_files.append(name)
        box = (
            f"drawbox=x=iw*0.05:y=ih*0.05:w=iw*0.9:h=ih*0.9:color=yellow@0.8:t=2,"
            f"drawbox=x=iw*0.1:y=ih*0.1:w=iw*0.8:h=ih*0.8:color=red@0.8:t=2"
        )
        ff.frame_png(render, rt, out / f"safe/S{i:02d}_{rt:.2f}.png", vf=box)
    if pair_files:
        ff.run([ff.FFMPEG, "-v", "error", "-y", *sum((["-i", p] for p in pair_files), []), "-filter_complex", f"vstack=inputs={len(pair_files)}" if len(pair_files) > 1 else "null", "pairs-sheet.png"], cwd=out)
    ff.run([ff.FFMPEG, "-v", "error", "-y", "-i", str(render.resolve()), "-vf", "fps=2,scale=360:-2,tile=6x4:padding=4", "-frames:v", "1", "phone-sheet.png"], cwd=out)
    m["pairs"] = [{"file": f, "render_t": rt, "reference_t": ft, "label": lb} for f, (lb, rt, ft) in zip(pair_files, pairs)]

    # Edge flags: lit pixels on the outer 1% border while the frame is not a full flood. Beams may touch the
    # edge on purpose, so the share is compared with the reference's own.
    flags = edge_scan(render)
    ref_flags = edge_scan(ref)
    w_r = len(flags) / max(1, round(ri.duration * 5))
    w_f = len(ref_flags) / max(1, round(fi.duration * 5))
    (out / "edges").mkdir(exist_ok=True)
    for j, fl_ in enumerate(flags[:12], 1):
        ff.frame_png(render, fl_["t"], out / f"edges/E{j:02d}_{fl_['t']:.2f}.png")
    m["edge_flags"] = flags
    m["edge_share"] = {"render": round(w_r, 2), "reference": round(w_f, 2)}

    # Still vs render similarity at poster times.
    if a.stills and Path(a.stills).is_dir():
        sims = []
        for still in sorted(Path(a.stills).glob("*.png")):
            mt = re.search(r"t(\d+(?:\.\d+)?)", still.stem)
            if not mt:
                continue
            t = float(mt.group(1))
            sims.append({"still": str(still), "t": t, "ssim": ssim_at(render, t, still, ri.width, ri.height)})
        m["stills_ssim"] = sims
        m["stills_below_092"] = [s for s in sims if s["ssim"] is not None and s["ssim"] < 0.92]

    m["loudness"] = {k: v for k, v in (ff.loudness(render) or {}).items() if k != "momentary"} or None
    dec = ff.run([ff.FFMPEG, "-v", "error", "-i", str(render), "-f", "null", "-"], check=False)
    m["decode_errors"] = len([ln for ln in dec.stderr.decode("utf-8", "replace").splitlines() if ln.strip()])

    if a.project and Path(a.project).is_dir():
        m["hyperframes_check"] = hyperframes_check(Path(a.project))
        m["code_smells"] = code_smells(Path(a.project))

    m["flags"] = flags_of(m)
    (out / "metrics.json").write_text(json.dumps(m, indent=2), encoding="utf-8")
    (out / "report.md").write_text(report(m), encoding="utf-8")
    print(report(m))


def edge_scan(path: Path) -> list[dict]:
    w, hh, frames = ff.gray_frames(path, 5, 192)
    bw, bh = max(1, round(w * 0.01)), max(1, round(hh * 0.01))
    out = []
    for i, f in enumerate(frames):
        if ff.luma_stats(f)["lit"] > 0.6:
            continue
        border = [f[y * w + x] for y in range(hh) for x in range(w) if y < bh or y >= hh - bh or x < bw or x >= w - bw]
        lit = sum(1 for px in border if px > 120) / len(border)
        if lit > 0.04:
            out.append({"t": round(i / 5, 2), "border_lit": round(lit, 3)})
    return out


def merge_events(scores: list[tuple[float, float]], th: float = 0.08, gap: float = 0.15) -> list[float]:
    out: list[tuple[float, float]] = []
    for t, s in scores:
        if s < th or t < 0.05:
            continue
        if out and t - out[-1][0] < gap:
            if s > out[-1][1]:
                out[-1] = (t, s)
            continue
        out.append((t, s))
    return [round(t, 3) for t, _ in out]


def matched_times(beat_plan: str | None, rdur: float, fdur: float) -> list[tuple[str, float, float]]:
    if beat_plan and Path(beat_plan).is_file():
        data = json.loads(Path(beat_plan).read_text(encoding="utf-8"))
        beats = data.get("beats", data if isinstance(data, list) else [])
        out = []
        for b in beats:
            r, f = b.get("render"), b.get("ref") or b.get("reference")
            if isinstance(r, list) and isinstance(f, list) and len(r) == 2 and len(f) == 2:
                # Compare the same share of each beat (its poster point), not the same second.
                share = 0.5
                if b.get("poster") is not None and r[1] > r[0]:
                    share = min(1, max(0, (float(b["poster"]) - r[0]) / (r[1] - r[0])))
                out.append((str(b.get("id", "")), round(r[0] + (r[1] - r[0]) * share, 2), round(f[0] + (f[1] - f[0]) * share, 2)))
        if out:
            return out
    return [("", round(rdur * k / 11, 2), round(fdur * k / 11, 2)) for k in range(1, 11)]


def pair_image(render: Path, rt: float, ref: Path, ft: float, out: Path, h: int, la: str, lb: str) -> None:
    font = ff.font_args()
    lab = lambda txt: f"drawtext={font}text='{txt}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6"  # noqa: E731
    fc = (
        f"[0:v]scale=-2:{h},setsar=1,{lab(la)}[a];"
        f"[1:v]scale=-2:{h},setsar=1,{lab(lb)}[b];"
        f"[a][b]hstack=inputs=2"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    ff.run([ff.FFMPEG, "-v", "error", "-y", "-ss", f"{rt:.3f}", "-i", str(render), "-ss", f"{ft:.3f}", "-i", str(ref), "-filter_complex", fc, "-frames:v", "1", str(out)])


def ssim_at(render: Path, t: float, still: Path, w: int, h: int) -> float | None:
    fc = f"[0:v]scale={w}:{h},format=yuv420p[a];[1:v]scale={w}:{h},format=yuv420p[b];[a][b]ssim"
    p = ff.run([ff.FFMPEG, "-v", "info", "-ss", f"{t:.3f}", "-i", str(render), "-i", str(still), "-filter_complex", fc, "-frames:v", "1", "-f", "null", "-"], check=False)
    mm = re.search(r"All:([\d.]+)", p.stderr.decode("utf-8", "replace"))
    return round(float(mm.group(1)), 3) if mm else None


def hyperframes_check(project: Path) -> dict:
    try:
        p = subprocess.run("npx hyperframes check --json", cwd=project, shell=True, capture_output=True, timeout=300)
        text = p.stdout.decode("utf-8", "replace")
        try:
            data = json.loads(text[text.find("{") :])
        except ValueError:
            data = {"raw": text[-2000:]}
        return {"exit": p.returncode, "result": data}
    except Exception as e:  # noqa: BLE001 - report, do not crash the measurement
        return {"error": str(e)}


SMELLS = [
    (r"data-layout-allow-[a-z-]+", "data-layout-allow-* found: allowed only on a single element, never on a scene root"),
    (r"clip-path\s*:\s*polygon", "clip-path polygon: a hard-edged beam unless a blur layer sits over it"),
    (r"transform[^;]*\b(?:rotate|skew)\([^)]*\)[^;]*;[^}]*logo|logo[^}]*transform[^;]*\b(?:rotate|skew)", "the logo looks rotated or skewed"),
]


def code_smells(project: Path) -> list[dict]:
    hits = []
    for f in list(project.rglob("*.html")) + list(project.rglob("*.css")) + list(project.rglob("*.js")):
        if "node_modules" in f.parts:
            continue
        text = f.read_text(encoding="utf-8", errors="replace")
        for pattern, why in SMELLS:
            for mm in re.finditer(pattern, text, flags=re.I):
                line = text.count("\n", 0, mm.start()) + 1
                hits.append({"file": str(f), "line": line, "why": why})
        if re.search(r"clip-path\s*:\s*polygon", text, re.I) and not re.search(r"blur\(", text, re.I):
            hits.append({"file": str(f), "line": 0, "why": "polygon beams with no blur anywhere in the file: flat light"})
    return hits[:60]


def flags_of(m: dict) -> list[str]:
    f = []
    if not m["spec"]["browser_safe"]:
        f.append("MP/tech: not H.264 yuv420p, the Review Booth cannot play it")
    if m["empty"]:
        f.append(f"MP2: empty spans {', '.join(f'{e['start']}-{e['end']}s' for e in m['empty'])} (planned?)")
    rc, fc = m["luma"]["render_first_content"], m["luma"]["reference_first_content"]
    if rc is not None and fc is not None and rc > fc + 0.1:
        f.append(f"MP2: first content at {rc}s, reference at {fc}s")
    if m["long_freezes"]:
        f.append(f"MP3: frozen {len(m['long_freezes'])}x for 1 s or more: " + ", ".join(f"{x['start']:.2f}s ({x['duration'] or 0:.2f}s)" for x in m["long_freezes"]))
    es = m["edge_share"]
    if es["render"] > es["reference"] + 0.2:
        f.append(f"MP1?: something lit touches the frame edge in {es['render']:.0%} of sampled frames vs {es['reference']:.0%} in the reference (open edges/ for cut-off text)")
    g = m["glow"]["ratio"]
    if g is not None and g < 0.6:
        f.append(f"D1: glow ratio {g} (< 0.6 of the reference): light looks hard and flat")
    if g is not None and g > 1.8:
        f.append(f"D1: glow ratio {g} (> 1.8 of the reference): light is a wash, not a defined beam")
    gc, gfc = m["glow"]["lit_cover_render"], m["glow"]["lit_cover_reference"]
    if gc and gfc and gc > gfc * 1.6:
        f.append(f"D1: light covers {gc:.0%} of the frame vs {gfc:.0%} in the reference")
    be = m["beat_error_frames"]
    if be["median"] is not None and be["median"] > 3:
        f.append(f"D3: beat error median {be['median']} frames, max {be['max']}")
    if be["missed_reference_events"]:
        f.append(f"D3: no render event near {len(be['missed_reference_events'])} reference events: {be['missed_reference_events']}")
    if abs(m["spec"]["render"]["duration"] - m["spec"]["reference"]["duration"]) > 0.5 and m["spec"]["render"]["duration"]:
        f.append(f"timing: render is {m['spec']['render']['duration']} s, reference {m['spec']['reference']['duration']} s (planned?)")
    lo = m.get("loudness")
    if lo and lo.get("integrated_lufs") is not None and (abs(lo["integrated_lufs"] + 14) > 1 or (lo.get("true_peak_dbtp") or -9) > -1):
        f.append(f"MP7: {lo['integrated_lufs']} LUFS, true peak {lo.get('true_peak_dbtp')} dBTP (want -14 +-1, <= -1)")
    if m.get("stills_below_092"):
        f.append(f"stills: {len(m['stills_below_092'])} poster frames differ from their approved still (SSIM < 0.92)")
    if m["decode_errors"]:
        f.append(f"MP/tech: {m['decode_errors']} decode errors")
    hc = m.get("hyperframes_check")
    if hc and hc.get("exit"):
        f.append("MP8: hyperframes check reports errors")
    if m.get("code_smells"):
        f.append(f"code: {len(m['code_smells'])} smells (see metrics.json)")
    return f


def report(m: dict) -> str:
    s = m["spec"]
    lines = ["# Measurements", "", "## Flags", *([f"- {x}" for x in m["flags"]] or ["- none"]), ""]
    lines += [
        "## Numbers",
        f"- render {s['render']['size']} {s['render']['fps']} fps {s['render']['duration']} s, {s['render']['codec']}/{s['render']['pix_fmt']}, audio {s['render']['audio']}; reference {s['reference']['size']} {s['reference']['duration']} s; same aspect: {s['aspect_matches']}",
        f"- luma r (same time): {m['luma']['r_same_time']}; first content render {m['luma']['render_first_content']} s vs reference {m['luma']['reference_first_content']} s",
        f"- glow (mid-tone share of lit pixels): render {m['glow']['render']} vs reference {m['glow']['reference']}, ratio {m['glow']['ratio']}; light covers {m['glow']['lit_cover_render']} vs {m['glow']['lit_cover_reference']} of the frame",
        f"- beat error: median {m['beat_error_frames']['median']} frames, max {m['beat_error_frames']['max']}",
        f"- events: render {len(m['events']['render'])}, reference {len(m['events']['reference'])}",
        f"- loudness: {m.get('loudness')}",
        f"- decode errors: {m['decode_errors']}",
        "",
        "## Look at",
        "- pairs-sheet.png, every pairs/*.png, safe/*.png, edges/*.png, phone-sheet.png",
    ]
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    main()
