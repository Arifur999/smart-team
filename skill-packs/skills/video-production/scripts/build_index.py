#!/usr/bin/env python3
"""Rebuild knowledge-index.csv from the frontmatter of every .md file.

Run from anywhere:  python scripts/build_index.py
Needs only the Python standard library.
"""
import csv
import re
from pathlib import Path

KB = Path(__file__).resolve().parent.parent
FIELDS = ["path", "title", "section", "type", "confidence", "sources", "updated"]


def read_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    data = {}
    if not m:
        return data
    for line in m.group(1).splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            data[key.strip()] = value.strip().strip("[]")
    return data


rows, problems = [], []
for md in sorted(KB.rglob("*.md")):
    if md.name == "SKILL.md" or {"scripts", "evals"} & set(md.relative_to(KB).parts):
        continue
    meta = read_frontmatter(md.read_text(encoding="utf-8"))
    rel = md.relative_to(KB).as_posix()
    missing = [f for f in FIELDS[1:] if f not in meta]
    if missing:
        problems.append(f"{rel}: missing {', '.join(missing)}")
    rows.append({"path": rel, **{f: meta.get(f, "") for f in FIELDS[1:]}})

with open(KB / "knowledge-index.csv", "w", newline="", encoding="utf-8") as fh:
    writer = csv.DictWriter(fh, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(rows)

print(f"Indexed {len(rows)} files.")
for p in problems:
    print("PROBLEM:", p)
if problems:
    raise SystemExit(1)
