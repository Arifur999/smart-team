---
title: Brief to Storyboard Method (7 Stages with Gates)
section: 02_VIDEO_EDITING/storytelling-and-pacing
type: recipe
confidence: creator-tested
sources: [saas-motion-kit, herk-edit-kit, own-synthesis]
updated: 2026-10-26
---

# Brief to storyboard: the seven stages

The agent does the production work. **You bring taste at the gates.** That split is what makes the result feel made by a person.

```
1 Brief → 2 Components → 3 Theme → 4 Storyboard → 5 Build → 6 Sound → 7 Deliver
   ▲ gate     ▲ gate       ▲ gate     ▲ gate        ▲ gate     ▲ gate    ▲ gate
```

## Stage 1: Brief

Run the intake in `00_INTAKE/intake-questionnaire.md` and write `brief.md` from `00_INTAKE/project-brief-template.md`.

**Gate:** the brief is approved.

## Stage 2: Components

Decide the visual building blocks. Real product UI if it is clean; imaginary components if not. List each component with its one job. **Gate:** the list is approved.

## Stage 3: Theme

Choose a visual language (palette, type, texture, motion style) that fits the tone. Shortlist two or three, pick one. Do not pick the theme you used in your last few films. **Gate:** theme approved.

## Stage 4: Storyboard (creative pass is mandatory)

1. Write the tone sentence at the top.
2. Fill the **ledger**, one row per shot: time range, what happens, tone, entrance, transition out, ease, direction, camera, accent colour, new component or not, notes.
3. Mark the one shot that breaks the pattern with `surprise` in its Notes.
4. Mark any shot that borrows from a reference with `ref:ID`, and add the reference ledger (ID, Creator, Link, What we borrow) below the shot ledger.
5. Run `python scripts/variety_audit.py storyboard.md` (rules in `01_MOTION_DESIGN/transitions-and-camera/seam-design.md`). Fix every FAIL or mark the repeat `motif:`.

**Gate:** storyboard approved after the creative pass.

## Stage 5: Build

Build shot by shot. Draft render early. Look at actual frames. **Gate:** draft reviewed.

## Stage 6: Sound

Voice first, then music bed, then effects tied to real actions. Measure loudness on the final file. **Gate:** sound approved.

## Stage 7: Deliver

Render at the highest source resolution, downscale for delivery, run the QC checklist, name and version the files. **Gate:** final watch-through.

## Storyboard ledger template

| # | Time | Shot | Tone | Entrance | Transition out | Ease | Direction | Camera | Accent | New component? | Notes |
|---|------|------|------|----------|----------------|------|-----------|--------|--------|----------------|-------|
| 1 | 0.0–1.2 | | | | | | | | | | |

Accent: up to two colours, comma-separated. Transition out: `cut` for a plain hard cut (not counted as a repeat).

| ID | Creator | Link | What we borrow (grammar only) |
|----|---------|------|-------------------------------|
| 01 | | | |

## Why gates matter

An agent can build a lot quickly in the wrong direction. A gate costs two minutes and saves a rebuild.
