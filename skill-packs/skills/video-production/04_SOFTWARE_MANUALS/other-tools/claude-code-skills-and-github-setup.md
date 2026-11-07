---
title: Skill Install, Maintenance and GitHub Setup
section: 04_SOFTWARE_MANUALS/other-tools
type: recipe
confidence: verify-first
sources: [herk-edit-kit, saas-motion-kit, own-synthesis]
updated: 2026-10-26
---

# Skill install, maintenance and GitHub setup

This knowledge base **is** the `video-production` skill: `SKILL.md` at the root is the entry point, the numbered folders are its references, `scripts/` holds the checks.

## Install

Claude Code finds personal skills in `~/.claude/skills/<name>/SKILL.md`. Keep one copy of the files (the note-to-rule loop writes back into them) and link it:

```powershell
# Windows: a directory junction needs no admin rights
New-Item -ItemType Junction -Path "$HOME\.claude\skills\video-production" -Target "<path>\08_KNOWLEDGE_BASE"
```

For one repo only, put the folder (or the junction) at `<repo>/.claude/skills/video-production/` instead.

Companion skills (official, maintained upstream; our manuals defer to them for API detail):

```bash
npx skills add heygen-com/hyperframes     # HyperFrames
npx skills add remotion-dev/skills        # Remotion
```

Machine requirements: Python 3, Node 22+, FFmpeg on PATH (`winget install Gyan.FFmpeg` on Windows).

## Why one skill and not several

The skill's name and description are always in context; the body loads only when triggered, and reference files only when a step needs them. One skill with tracks keeps the always-on cost to one description and keeps the intake, gates and QC shared. Split a track into its own skill only if it starts being used on its own a lot.

## Maintenance rules

1. Keep `SKILL.md` short: steps, gates, and which file to read at each step. Knowledge goes in the numbered folders.
2. Anything measurable becomes a script in `scripts/`, not a reminder.
3. Every note on a draft becomes a rule (`05_RESEARCH_NOTES/lessons-learned/note-to-rule-loop.md`).
4. After adding or renaming files, run `python scripts/build_index.py` to refresh `knowledge-index.csv` (a catalogue for people; the agent routes through `SKILL.md`).
5. When an engine updates, re-check its manual against the official skill and update `updated:`.

## GitHub practices

- Private repo for anything client-related; never commit footage, renders, third-party reference clips or API keys (`.gitignore`, `.env` + `.env.example`).
- Large binary resources (LUTs, SFX, fonts) in Git LFS or cloud storage, not in the skill folder.
- Commit messages name the rule changed ("captions: never over the mouth in the first 2.5 s").
- Optional: a GitHub Action that runs `scripts/build_index.py` so the index never goes stale.

## Licensing hygiene when learning from other kits

Check a kit's licence before copying anything. Take ideas and measurements, rewrite in your words, credit the source, never copy assets. See `05_RESEARCH_NOTES/technique-breakdowns/reference-credit-policy.md`.
