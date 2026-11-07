#!/usr/bin/env python3
"""Check a storyboard ledger for accidental repetition (rules in seam-design.md).

Usage:
  python scripts/variety_audit.py storyboard.md

Reads the first markdown table whose header has "Transition out" (the ledger) and,
if present, a table whose header has "Creator" (the reference ledger). A cell that
contains "motif:" is a deliberate repeat and is not counted. Put the word
"surprise" in the Notes of the shot that breaks the film's pattern.
Exit code 1 when a FAIL is found. Standard library only.
"""
import re
import sys
from collections import Counter
from pathlib import Path

PLAIN_CUTS = {"cut", "hard cut", "hard-cut", "-", ""}
SLOW_TONES = {"calm", "premium"}


def tables(text):
    found, current = [], []
    for line in text.splitlines() + [""]:
        if line.strip().startswith("|"):
            current.append([c.strip() for c in line.strip().strip("|").split("|")])
        elif current:
            found.append(current)
            current = []
    return found


def as_rows(table):
    header = [h.lower() for h in table[0]]
    body = [r for r in table[1:] if not all(set(c) <= set("-: ") for c in r)]
    return header, [dict(zip(header, r)) for r in body if any(c for c in r)]


def column(header, *names):
    return next((h for h in header for n in names if n in h), None)


def seconds(time_range):
    nums = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", time_range or "")]
    return nums[1] - nums[0] if len(nums) >= 2 else None


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    found = tables(Path(sys.argv[1]).read_text(encoding="utf-8"))
    ledger = next((t for t in found if any("transition out" in h.lower() for h in t[0])), None)
    if not ledger:
        sys.exit("No ledger table found (needs a 'Transition out' column).")
    header, rows = as_rows(ledger)
    results = []

    def counted(col):
        key = column(header, col)
        if not key:
            return Counter()
        return Counter(r[key].lower() for r in rows if r.get(key) and "motif:" not in r[key].lower())

    transitions = counted("transition out")
    for name, n in transitions.items():
        if name not in PLAIN_CUTS and n > 2:
            results.append(("FAIL", f"Transition '{name}' used {n} times (max 2 unless marked motif:)"))
    for col, label in (("entrance", "Entrance"), ("ease", "Ease"), ("direction", "Direction"),
                       ("camera", "Camera move")):
        values = counted(col)
        if len(rows) >= 4 and len(values) == 1:
            results.append(("FAIL", f"{label} is the same on every shot: '{next(iter(values))}'"))
        elif values and len(rows) >= 4 and values.most_common(1)[0][1] / len(rows) > 0.6:
            name, n = values.most_common(1)[0]
            results.append(("WARN", f"{label} '{name}' on {n} of {len(rows)} shots"))

    time_key, tone_key = column(header, "time"), column(header, "tone")
    lengths = [(r, seconds(r.get(time_key, ""))) for r in rows] if time_key else []
    durations = [d for _, d in lengths if d is not None]
    if len(durations) >= 4 and max(durations) - min(durations) < 0.15:
        results.append(("FAIL", "All shots are the same length"))
    for r, d in lengths:
        tone = (r.get(tone_key, "") if tone_key else "").lower()
        shot = r.get("#", "?")
        if d is not None and any(t in tone for t in SLOW_TONES) and d < 0.67:
            results.append(("WARN", f"Shot {shot}: {d:.2f}s is fast for a {tone} tone (over 1.5 cuts/s)"))
        if d is not None and "urgent" in tone and d > 2.0 and "pause" not in r.get("notes", "").lower():
            results.append(("WARN", f"Shot {shot}: {d:.2f}s hold in an urgent tone"))

    accent_key = column(header, "accent")
    for r in rows if accent_key else []:
        accents = [a for a in re.split(r"[,/+&]| and ", r.get(accent_key, "")) if a.strip()]
        if len(accents) > 2:
            results.append(("FAIL", f"Shot {r.get('#', '?')}: {len(accents)} accent colours (max 2)"))

    if not any("surprise" in " ".join(r.values()).lower() for r in rows):
        results.append(("WARN", "No shot marked 'surprise' (plan one moment that breaks the pattern)"))

    refs = {m for r in rows for m in re.findall(r"ref:\s*([\w-]+)", " ".join(r.values()))}
    if refs:
        ref_table = next((t for t in found if any("creator" in h.lower() for h in t[0])), None)
        credited = set()
        if ref_table:
            rh, rr = as_rows(ref_table)
            id_key = column(rh, "id")
            credited = {x.get(id_key, "") for x in rr if x.get(column(rh, "creator"), "")}
        for ref in sorted(refs - credited):
            results.append(("FAIL", f"ref:{ref} has no credited row in the reference ledger"))

    print(f"Variety audit: {len(rows)} shots, transitions used: {dict(transitions)}")
    for status, msg in results or [("PASS", "No repetition problems found")]:
        print(f"{status}: {msg}")
    sys.exit(1 if any(s == "FAIL" for s, _ in results) else 0)


if __name__ == "__main__":
    main()
