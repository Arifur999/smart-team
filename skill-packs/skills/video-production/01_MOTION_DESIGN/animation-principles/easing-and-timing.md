---
title: Easing and Timing
section: 01_MOTION_DESIGN/animation-principles
type: rule
confidence: established
sources: [own-synthesis, herk-edit-kit]
updated: 2026-10-26
---

# Easing and timing

## The one rule

Things that **arrive** decelerate (ease-out). Things that **leave** accelerate (ease-in). Things that **move between two points on screen** do both (ease-in-out). Linear motion looks mechanical, except for continuous things like a scrolling ticker, a progress sweep, or a slow camera drift.

## Pick the ease by job

| Job | Ease family | Typical duration | Why |
|---|---|---|---|
| Element enters | `power2.out` / `power3.out` / `expo.out` | 0.3–0.8 s | Fast start grabs the eye, soft landing reads as settled |
| Element exits | `power2.in` | 0.2–0.4 s | Leaves quickly; the viewer does not wait for it |
| Camera move between stops | `power2.inOut` | 1.2–2.3 s | Both ends are soft, like a real operator |
| Ambient drift, breathing | `sine.inOut`, yoyo, repeat | 2–4 s per cycle | Never has a visible start or end |
| Playful pop / settle | `back.out(1.2–1.7)` | 0.3–0.5 s | Small overshoot feels alive |
| Hard snap, technical feel | `steps()`, `power4.out` | 0.1–0.3 s | Feels digital and exact |
| Hold after an entry | `none` (linear) | 0.4–0.7 s | Keeps drift going without a new curve |

Avoid `elastic` on UI or text. It looks cheap fast. If you must, keep it under about 0.2 s and low amplitude.

## Duration cheat sheet

- Small UI change (a toggle, a tick): 0.15–0.3 s
- Card, label, or word entering: 0.3–0.6 s
- Title or hero object entering: 0.6–1.2 s
- Whip transition: 0.3–0.4 s
- Camera dolly or push-in: 1.5–4 s
- Hold on the hero shot or logo: 1.5–2 s
- CTA or end card: 4–6 s (long-form brand film); 1.5–3 s (short-form reel)

## Frame math

Work in frames, not seconds, when you code. At 30 fps one frame is 33 ms; at 60 fps, 16.7 ms. End every tween on a frame boundary. Steep easings (`expo.in`, `power4.in`) can alias or jump when they end between frames.

## Speed communicates tone

Slow and soft says calm or premium. Short and snappy says urgent or technical. Choose the speed from the tone, not from habit. See the tone matrix.

## Common mistakes

- Same ease on everything. The film feels like one repeated gesture. Vary on purpose.
- Entrances longer than the information needs. The viewer waits for text to finish moving before they can read it.
- Exits as slow as entrances. Exit faster.
- Animating `top` / `left` in code. Animate `x`, `y`, `scale` (transforms) instead. Smoother and cheaper.
- Relying on inherited defaults (`gsap.defaults()`). Set ease and duration on each tween so nothing surprises you when you debug.
