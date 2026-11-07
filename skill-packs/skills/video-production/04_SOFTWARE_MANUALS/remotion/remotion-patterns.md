---
title: Remotion Patterns for This Ecosystem
section: 04_SOFTWARE_MANUALS/remotion
type: recipe
confidence: verify-first
sources: [own-synthesis, herk-edit-kit]
updated: 2026-10-26
---

# Remotion patterns

Reusable shapes for the kinds of videos we make. Pseudocode-level: adapt to your project.

## Project layout

```
src/
  index.ts              # registerRoot
  Root.tsx              # all <Composition> entries
  compositions/         # one folder per video type
  components/           # captions, lower thirds, callouts, logo
  lib/
    timing.ts           # seconds → frames helpers
    tokens.ts           # colours, fonts, spacing (single source of truth)
public/                 # media (large files ignored by git or in LFS)
```

## Rule: one design-tokens file

Colours, fonts, sizes, and safe margins live in `tokens.ts`. Components read from it. This is how a template changes brand without a rewrite.

## Pattern: data-driven video

Pass a JSON object as props (script lines with start times, caption chunks, brand colours). The composition renders from data. This makes batch variations (ten dentist clinics, ten offers) cheap.

## Pattern: captions from word timestamps

1. Load captions in the `@remotion/captions` `Caption` shape: `{ text, startMs, endMs, timestampMs, confidence }` (milliseconds; keep the leading space in `text`). `parseSrt()` converts an SRT. Local transcription: `@remotion/whisper-webgpu` (see the `remotion-captions` skill).
2. Group into 1–3 word chunks on phrase boundaries.
3. Render the captions inside the same `<Sequence>` as their `<Video>` so they share its clock. Show each chunk about 2 frames before its first word (our house rule, not a Remotion rule).
4. Style from one caption component. See `02_VIDEO_EDITING/captions-and-titles/caption-style-rules.md`.

## Pattern: beat grid

Compute beat times from the music analysis, convert to frames, and store as an array. Start scenes and hits on beat frames. Changing the track means replacing the array, not rewriting scenes.

## Pattern: split layout for vertical reels

A parent `<AbsoluteFill>` with two children: top region B-roll, bottom region speaker, with a shared caption on the seam. Switch layouts by changing which sequence is active (hard cut).

## Pattern: ledger-driven build

Keep a `shots.ts` that mirrors the storyboard ledger (id, start, duration, tone, transition). The composition loops over it. The ledger and the video cannot drift apart.

## Quality checklist for a Remotion project

- [ ] All motion from the frame number
- [ ] Seeded randomness only
- [ ] Fonts loaded and licensed
- [ ] Media in constant frame rate
- [ ] Safe margins from tokens
- [ ] Still frames checked at key moments
- [ ] Draft render viewed before final
