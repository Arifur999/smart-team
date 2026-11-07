---
title: Deterministic and Seek-Safe Rendering
section: 01_MOTION_DESIGN/visual-effects
type: rule
confidence: creator-tested
sources: [saas-motion-kit, herk-edit-kit]
updated: 2026-10-26
---

# Deterministic and seek-safe rendering

Code-driven video renders frame by frame, often out of order and in parallel. If a frame depends on anything except time, renders differ and previews lie.

## The rule

**Every frame must be a pure function of time.** Same time in, same pixels out, every run.

## Do

- One paused animation timeline per composition, driven by the renderer's seek.
- Seeded random numbers or harmonic functions (sums of sines) for "random" looks.
- Whole-number cycles for loops: ambient motion uses `sin(2π · n · t / LOOP)` with integer `n`, so the end matches the start. Check the seam with a loop-check script.
- Local copies of fonts, libraries, and images for the final render.
- Canvas 2D for procedural drawing. Provide a fallback for headless render.
- Drive procedural rendering from one tween that advances a time value, then draw from that value.

## Do not

- `Math.random()`, `Date.now()`, or `performance.now()` in anything that draws.
- Timers, network fetches, or infinite repeats (`repeat: -1`) inside a composition.
- Rely on CSS animations or transitions that run on their own clock.
- Depend on a network font or CDN at final render time. Public CDNs are fine for drafts.
- Animate `top` or `left`. Use transforms.
- Use live WebGL in a headless render without testing. It can stall.

## Render workflow that saves hours

1. Lint or validate the project.
2. Preview, scrub the timeline by hand.
3. Render a **draft** (fast, low quality) and look at actual frames.
4. Render at high resolution (for example 4K), then downscale with a high-quality filter (Lanczos) for delivery. Edges, text, and 3D come out cleaner than a native low-res render.
5. Check the final file: duration, audio, loudness, first and last frames.

## Common failures and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Scene disappears early or flashes black at its end | Slot shorter than the visible content, or timeline shorter than the slot | Make the slot span the visible time; pad the timeline with a no-op tween |
| Final pose missing on the last frame | Tween ends exactly at the end time | Land the end state one frame earlier |
| Video clip flickers or goes black at the end | Source ends before the slot | Bracket with poster and last-frame stills |
| Loop jumps at the seam | Non-integer cycles | Use whole cycles per loop; run the loop check |
| Missing glyphs (ş, ğ, İ) | Font subset lacks them | Ship fonts with the needed subsets locally |
| Wrong uppercase letters in some languages | CSS `text-transform` | Type uppercase yourself, set `lang` per word |
| Every render looks different | Unseeded random | Use a seeded generator |
| Stutter on a fast ease at the end | Tween ends between frames | Snap end times to multiples of 1/fps |
