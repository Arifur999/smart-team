---
title: Camera Moves for 2D and 3D Motion Work
section: 01_MOTION_DESIGN/transitions-and-camera
type: reference
confidence: established
sources: [own-synthesis, saas-motion-kit]
updated: 2026-10-26
---

# Camera moves

Even in flat motion graphics, a virtual camera makes a piece feel filmed instead of slid together. Do the move on a parent container (scale, x, y, rotate) so everything inside moves together.

## Move library

| Move | Feel | How |
|---|---|---|
| **Slow push-in** | Attention, intimacy, tension | Scale the whole scene 1.00 → 1.06 over the shot. Default for any shot that would otherwise be still |
| **Pull-back reveal** | Scale, payoff | Start tight on a detail, ease out to the whole. Good for proof and celebration |
| **Dolly through** | Energy, transition | Scale a hero element large while fading, as the next scene arrives behind |
| **Parallax pan** | Depth, calm | Move layers at different speeds (background slow, foreground faster) |
| **Whip pan** | Urgency | Fast horizontal move with directional blur, then settle |
| **Crash zoom** | Shock, emphasis | Very fast scale-in on a word or face. Use once or twice |
| **Orbit / turntable** | Product showcase | Rotate a 3D object or fake it with layered rotation |
| **Top-down / orthographic** | Technical, diagrammatic | No perspective; snap to a grid |
| **Handheld drift** | Warm, human | Tiny irregular x/y/rotation noise (subtle). Must be seeded, not random |
| **Rack focus** | Premium | Blur foreground, sharpen background, then swap |
| **Locked-off** | Trust, calm | No camera move; only elements move |

## Rules

- **Motivate the move.** It reveals, follows, or emphasises. Otherwise leave it static.
- **Match the tone.** Calm and premium want slow moves with soft ends. Urgent wants snaps and whips.
- **Never stack two big moves** (a whip and a crash zoom in the same second).
- **Vary the move from shot to shot.** Five push-ins in a row is the same shot five times.
- **Keep the subject readable.** After the move settles, the key content must be inside the safe area.
- **Everything is a function of time.** No random jitter without a seed.

## Constant slow motion under static shots

Add a very slow push or drift (1–6% over the shot) to anything that holds longer than about a second. It stops stills from looking frozen without drawing attention.

## Rule of three for shot types

Mix wide (context), medium (subject), and tight (detail). Moving between them is more interesting than three mediums.
