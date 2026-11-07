"""Check a critique verdict before you hand it in. The hub recomputes the score the same way, so fix what this reports.

Usage:  python verdict.py critique/v2.json [--rubric 02-plan/rubric.json] [--direction match|concept] [--pass-mark 80] [--root .]

Checks: required fields; every dimension 0-10 with evidence; total = sum(weight x score) / 10; pass only when
total >= pass mark, every dimension >= 6, every must-pass ok and no open P0; a failed must-pass caps its
dimension at 4; every dimension under 9 has a fix; fixes have severity, a known stage, a problem and an exact
fix; at most 12 fixes, P0 first; evidence paths exist. Exit code 1 when anything is wrong.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

WEIGHTS = {
    "match": {"light": 25, "type": 15, "timing": 20, "transitions": 10, "brand": 15, "safe": 10, "tech": 5, "idea": 0},
    "concept": {"light": 15, "type": 15, "timing": 15, "transitions": 10, "brand": 20, "safe": 10, "tech": 5, "idea": 10},
}
# Which dimension a must-pass item belongs to, for the cap of 4.
MUST_DIM = {"MP1": "safe", "MP2": "timing", "MP3": "timing", "MP4": "brand", "MP5": "type", "MP6": "tech", "MP7": "tech", "MP8": "tech"}
STAGES = {"plan", "storyboard", "animate", "sound", "variants"}
SEV = {"P0": 0, "P1": 1, "P2": 2}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("verdict")
    ap.add_argument("--rubric")
    ap.add_argument("--direction", default="match", choices=["match", "concept"])
    ap.add_argument("--pass-mark", type=float, default=80)
    ap.add_argument("--root", default=".", help="folder evidence paths are relative to")
    a = ap.parse_args()

    v = json.loads(Path(a.verdict).read_text(encoding="utf-8"))
    weights = dict(WEIGHTS[a.direction])
    if a.rubric and Path(a.rubric).is_file():
        r = json.loads(Path(a.rubric).read_text(encoding="utf-8"))
        for d in r.get("dimensions", []):
            if "id" in d and "weight" in d:
                weights[d["id"]] = float(d["weight"])
        a.pass_mark = float(r.get("pass_mark", a.pass_mark))

    problems: list[str] = []
    for key in ("score", "pass", "summary", "fixes", "dimensions", "must_pass"):
        if key not in v:
            problems.append(f"missing field: {key}")

    dims = {d.get("id"): d for d in v.get("dimensions", []) if isinstance(d, dict)}
    for did, w in weights.items():
        if w and did not in dims:
            problems.append(f"dimension {did} (weight {w}) has no score")
    must = v.get("must_pass", [])
    failed_must = [m.get("id") for m in must if not m.get("ok")]
    for d in dims.values():
        sc = d.get("score")
        if not isinstance(sc, (int, float)) or not 0 <= sc <= 10:
            problems.append(f"dimension {d.get('id')}: score must be 0-10")
            continue
        if not d.get("evidence"):
            problems.append(f"dimension {d.get('id')}: no evidence")
        for mid in failed_must:
            if MUST_DIM.get(mid) == d.get("id") and sc > 4:
                problems.append(f"dimension {d.get('id')} is {sc} but {mid} failed: cap it at 4")

    total = round(sum(weights.get(i, 0) * float(d.get("score", 0)) for i, d in dims.items()) / 10, 1)
    if isinstance(v.get("score"), (int, float)) and abs(float(v["score"]) - total) > 0.5:
        problems.append(f"score {v['score']} does not match the weighted total {total}")

    fixes = v.get("fixes", [])
    if len(fixes) > 12:
        problems.append(f"{len(fixes)} fixes: keep the 12 that matter most")
    order = [SEV.get(f.get("severity"), 9) for f in fixes]
    if order != sorted(order):
        problems.append("fixes are not ordered P0 first")
    for f in fixes:
        fid = f.get("id", "?")
        if f.get("severity") not in SEV:
            problems.append(f"fix {fid}: severity must be P0, P1 or P2")
        if f.get("stage") not in STAGES:
            problems.append(f"fix {fid}: stage must be one of {sorted(STAGES)}")
        if not f.get("problem") or not f.get("fix"):
            problems.append(f"fix {fid}: needs a problem and an exact fix")
        elif not any(ch.isdigit() for ch in f["fix"]):
            problems.append(f"fix {fid}: the fix has no number in it; say exactly how much")
        ev = f.get("evidence")
        if ev and not (Path(a.root) / ev).exists():
            problems.append(f"fix {fid}: evidence {ev} does not exist")
    fixed_dims = " ".join(f"{f.get('problem', '')} {f.get('fix', '')} {f.get('dimension', '')}" for f in fixes).lower()
    for i, d in dims.items():
        if weights.get(i) and isinstance(d.get("score"), (int, float)) and d["score"] < 9 and not any(f.get("dimension") == i for f in fixes) and i not in fixed_dims:
            problems.append(f"dimension {i} scored {d['score']} (< 9) but no fix names it (add \"dimension\": \"{i}\" to its fix)")
    for d in dims.values():
        for ev in d.get("evidence", []) if isinstance(d.get("evidence"), list) else []:
            if isinstance(ev, str) and "/" in ev and not (Path(a.root) / ev).exists():
                problems.append(f"dimension {d.get('id')}: evidence {ev} does not exist")

    open_p0 = any(f.get("severity") == "P0" for f in fixes)
    low = [i for i, d in dims.items() if weights.get(i) and isinstance(d.get("score"), (int, float)) and d["score"] < 6]
    should_pass = total >= a.pass_mark and not low and not failed_must and not open_p0
    if bool(v.get("pass")) != should_pass:
        why = [f"total {total} vs pass mark {a.pass_mark}"] + ([f"dimensions under 6: {low}"] if low else []) + ([f"failed must-pass: {failed_must}"] if failed_must else []) + (["an open P0 fix"] if open_p0 else [])
        problems.append(f"pass is {v.get('pass')} but should be {should_pass} ({'; '.join(why)})")

    print(json.dumps({"total": total, "should_pass": should_pass, "problems": problems}, indent=2))
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
