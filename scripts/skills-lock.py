"""Write skill-packs/vendor.json: where each copied skill came from, its licence and a hash of its files.

Usage: python scripts/skills-lock.py        (run after copying or updating a third-party skill)
"""
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "skill-packs"

SOURCES = {
    "accessibility-audit": ("design-skills plugin, github.com/cuellarfr/design-skills", "MIT"),
    "design-critique": ("design-skills plugin, github.com/cuellarfr/design-skills", "MIT"),
    "interaction-design": ("design-skills plugin, github.com/cuellarfr/design-skills", "MIT"),
    "ux-writing": ("design-skills plugin, github.com/cuellarfr/design-skills", "MIT"),
    "creative": ("design-superpowers plugin, github.com/LSDimi/design-superpowers", "MIT"),
    "map-design": ("design-superpowers plugin, github.com/LSDimi/design-superpowers", "MIT"),
    "frontend-design": ("claude-plugins-official, frontend-design plugin", "Apache-2.0"),
    "humanizer": ("synced Claude skill, Siqi Chen", "MIT"),
    "prompt-master": ("synced Claude skill, Nidhin Joseph Nelson", "MIT"),
    "skill-creator": ("synced Claude skill, Anthropic", "Apache-2.0"),
    "video-production": ("Arif's own video knowledge base (synced copy)", "own"),
}


def tree_hash(folder: Path) -> str:
    h = hashlib.sha256()
    for dirpath, _, files in sorted(os.walk(folder)):
        for name in sorted(files):
            p = Path(dirpath) / name
            h.update(p.relative_to(folder).as_posix().encode())
            h.update(b"\0")
            h.update(p.read_bytes())
    return h.hexdigest()[:12]


def main() -> None:
    lock = {}
    for name, (source, licence) in sorted(SOURCES.items()):
        folder = ROOT / "skills" / name
        if folder.is_dir():
            lock[name] = {"from": source, "license": licence, "sha": tree_hash(folder)}
    out = {"$comment": "Skills copied into skill-packs/skills from elsewhere. Re-copy, then rerun scripts/skills-lock.py.", "skills": lock}
    (ROOT / "vendor.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"{len(lock)} vendored skills locked")


if __name__ == "__main__":
    main()
