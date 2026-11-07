---
title: Knowledge Base — Start Here
section: root
type: reference
confidence: established
sources: [own-synthesis]
updated: 2026-10-26
---

# 08_KNOWLEDGE_BASE (the `video-production` skill)

The text knowledge layer of the video production ecosystem: rules, recipes, checklists, templates and check scripts. It holds **no** footage, audio, LUTs, fonts or project files.

**Agents start at `SKILL.md`.** It runs the intake, picks the track and engine, and names the file to read at each step. This README is for people maintaining the base.

## Layout

| Folder | Holds |
|---|---|
| `00_INTAKE/` | Intake questionnaire and brief template |
| `01_MOTION_DESIGN/` | Easing, kinetic type, transitions, camera, effects, deterministic rendering |
| `02_VIDEO_EDITING/` | Cutting, story and pacing, tone, captions, colour, QC |
| `03_AUDIO_ENGINEERING/` | Dialogue cleanup, music and SFX, mixing, loudness, delivery specs |
| `04_SOFTWARE_MANUALS/` | House notes for HyperFrames, Remotion, ffmpeg, audio tools, skill install |
| `05_RESEARCH_NOTES/` | Lessons, experiments, reference breakdowns: the evidence that changes rules |
| `scripts/` | `probe_assets.py`, `variety_audit.py`, `qc_report.py`, `build_index.py` |

Install and maintenance: `04_SOFTWARE_MANUALS/other-tools/claude-code-skills-and-github-setup.md`.

## File conventions

Every knowledge file starts with this frontmatter:

```yaml
---
title: Plain title
section: 01_MOTION_DESIGN/animation-principles
type: principle | rule | recipe | reference | template | log
confidence: established | creator-tested | verify-first
sources: [own-synthesis, herk-edit-kit, saas-motion-kit, hyperframes-repo, remotion-repo]
updated: YYYY-MM-DD
---
```

- `established`: standard craft knowledge. Safe to apply.
- `creator-tested`: measured or learned by one creator in their own work. A strong starting point, not law. Break it on purpose, never by accident.
- `verify-first`: version-specific or number-specific (tool flags, platform specs, licences). Check the official source before relying on it.

## Writing rules for this base

- Plain, direct language. Short sentences. No filler.
- One idea per file. If a file passes about 250 lines, split it.
- Rules say *what to do* and *why*. A rule with no reason does not go in.
- Numbers always say where they come from.
- One home per rule. If two files need it, one holds it and the other points to it.
- Never paste other people's text. Paraphrase, credit in `sources`, and record the credit in `SOURCES.md`.

## Index

`knowledge-index.csv` lists every file with its title, section, type and confidence. Rebuild it after any change: `python scripts/build_index.py`.

## Open items

- `nextwork-projects/ai-video-editor-cooked` could not be read. See `SOURCES.md`.
- Resource folders (LUTs, SFX, fonts, sample footage, project templates) belong outside this skill.
- Our own measured house style (from the user's best-performing videos) has not been recorded yet. The short-form numbers are one other creator's.
