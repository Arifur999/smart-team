---
title: Lessons Log
section: 05_RESEARCH_NOTES/lessons-learned
type: log
confidence: creator-tested
sources: [herk-edit-kit, saas-motion-kit, own-synthesis]
updated: 2026-10-26
---

# Lessons log

Newest first. Add your own lessons above the seeded ones. Replace seeded lessons with your own evidence as it arrives.

## Your project lessons

| Date | Project | Lesson | Status | Rule file |
|---|---|---|---|---|
| | | | | |

## Seeded lessons (external, from the reference kits)

These come from other people's work. Treat them as strong hints. Mark each `confirmed` after it holds in your own projects.

| # | Lesson | Source | Rule file |
|---|---|---|---|
| E1 | White captions on bright footage are unreadable. Use one dark box with a thin light edge for every caption and measure contrast. | herk-edit-kit | `captions-and-titles/caption-style-rules.md` |
| E2 | Video B-roll beats AI-generated stills. Stills only become the first frame of an AI video. | herk-edit-kit | `editing-techniques/b-roll-rules.md` |
| E3 | Every shot must move. Add a slow push-in to anything that would otherwise be still. | herk-edit-kit | `transitions-and-camera/camera-moves.md` |
| E4 | Cheap-sounding effects (zaps, plops) hurt quality. Use soft taps, dry clicks, paper, air. | herk-edit-kit | `sound-design/sfx-palette-rules.md` |
| E5 | Encoding segments separately then joining drifts lip sync. Select exact frames in one pass and compare cut frames to the raw. | herk-edit-kit | `ffmpeg/ffmpeg-qc-and-sync.md` |
| E6 | Cutting a filler out of a phrase clips the neighbour words. Cut between phrases only. Fewer cuts can sound better and run longer. | herk-edit-kit | `dialogue-cleanup/speech-cut-hygiene.md` |
| E7 | A caption over the mouth in the first second makes viewers distrust the clip. | herk-edit-kit | `captions-and-titles/caption-style-rules.md` |
| E8 | Measure loudness on the stereo, delivered file. A mono file reads about 3 dB lower and one short shipped too loud. | herk-edit-kit | `loudness-and-export/loudness-targets.md` |
| E9 | Seeking over HTTP for short clips can take over ten minutes. Download the full stream and cut locally. | herk-edit-kit | `ffmpeg/ffmpeg-cookbook.md` |
| E10 | Browser screen recorders capture CSS pixels, so high-DPR recordings come out small. Capture frame by frame. | herk-edit-kit | `editing-techniques/b-roll-rules.md` |
| E11 | Animate transforms, not `top` or `left`. | herk-edit-kit | `animation-principles/easing-and-timing.md` |
| E12 | A raw recording caps the edit. Script the hook before recording. | herk-edit-kit | `editing-techniques/transcript-driven-editing.md` |
| E13 | Level every narration line to the same loudness and limit only peaks. Scaling a line down to fit its loudest peak made one line 5 dB quieter. | herk-edit-kit | `dialogue-cleanup/speech-cut-hygiene.md` |
| E14 | Automated "AI watch tests" hallucinate. Verify every complaint on real frames. Your own review is the final gate. | herk-edit-kit | `editing-techniques/qc-checklist.md` |
| E15 | Render at 4K and downscale with Lanczos. Edges, text, and 3D come out cleaner. | saas-motion-kit | `loudness-and-export/delivery-specs.md` |
| E16 | Every frame must be a pure function of time. No unseeded random or wall-clock time. | saas-motion-kit | `visual-effects/deterministic-rendering.md` |
| E17 | Run the variety audit on your own first draft. The kit's own draft had eleven repeats. | saas-motion-kit | `transitions-and-camera/seam-design.md` |
| E18 | Pure sine beeps sound thin and eerie. Warm tuned timbres in one key feel friendly. | saas-motion-kit | `sound-design/sfx-palette-rules.md` |
| E19 | If a viewer must read to follow the story, the visuals are failing. Cut text to labels and one line per beat. | saas-motion-kit | `typography-animation/kinetic-type-rules.md` |
| E20 | Do not add a progress bar to a brand film. It reads as a screen recording. | saas-motion-kit | `other-tools/hyperframes-manual.md` |
| E21 | Fonts without needed glyph subsets silently lose characters (for example Turkish). | saas-motion-kit | `typography-animation/kinetic-type-rules.md` |
| E22 | Uppercase transforms break letters in some languages. Type uppercase yourself and set `lang`. | saas-motion-kit | `typography-animation/kinetic-type-rules.md` |
| E23 | Timelines shorter than their slot can flash black at the end. Pad every timeline to its slot. | herk-edit-kit | `transitions-and-camera/seam-design.md` |
