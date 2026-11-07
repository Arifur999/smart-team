---
title: Tone Matrix
section: 02_VIDEO_EDITING/storytelling-and-pacing
type: reference
confidence: creator-tested
sources: [saas-motion-kit, own-synthesis]
updated: 2026-10-26
---

# Tone matrix

Decide the tone before you choose a single effect. Start every storyboard with one sentence:

> **I want to say** ___ **in a** ___ **tone, so the viewer feels** ___.
>
> Example: I want to say "problems get caught before customers notice" in a calm, trustworthy tone, so the viewer feels relieved.

Then let the tone set the craft. The rows are starting points. Break them on purpose, never by accident.

| Tone | Speed and rhythm | Eases | Camera | Colour | Type | Transitions that fit | Sound |
|---|---|---|---|---|---|---|---|
| **Calm** | Long holds (2–4 s), few cuts | `sine.inOut`, `power1` | Slow push-in, gentle parallax | Low contrast, one soft accent | Light weights, generous spacing | Dissolve, focal iris, parallax slide | Airy pads, soft ticks, room for silence |
| **Trustworthy** | Even, predictable beats | `power2.out` | Locked-off, then precise moves | Brand primary plus neutral greys | Clear sans, numbers in mono | Shape match cut, line-to-horizon, type carry | Warm wood or marimba, a confirm tone |
| **Urgent** | Short shots (0.4–1 s), accelerating | `expo.in`/`expo.out`, snaps | Whip pans, crash zooms | High contrast; alert colour allowed | Condensed, tight, uppercase | Whip pan, beat cut, speed ramp | Ticking, rising pitch, hard stops |
| **Playful** | Bouncy, syncopated | `back.out(1.7)`, small overshoot | Tilt, bobbing | Saturated secondaries | Rounded, mixed sizes | Object carry, paper fold, dither | Pops, plucks, 8-bit bleeps |
| **Premium** | Slow, deliberate, few moves | `power3.inOut`, long tails | Dolly, rack focus, macro | Dark ground, one metallic or brand highlight | Serif display, wide tracking | Push-through, glass refraction, focal iris | Low drones, one piano note, silence |
| **Technical** | Grid-locked, on the beat | `steps()`, `power4.out` | Orthographic, top-down, snap-to-grid | Monochrome plus one signal colour | Mono, tabular numbers | Split stack, dither, cursor carry | Clicks, data blips, keyboard |
| **Warm / human** | Natural, slightly irregular | `power2.inOut` | Subtle handheld-feel drift | Warm neutrals, skin and paper tones | Humanist sans, handwriting accents | Ink bleed, paper fold, type carry | Acoustic, wood, soft hum |
| **Bold / confident** | Big beats, hard cuts | `power4.out`, `expo.out` | Frontal, symmetrical, big scale jumps | Brand colour flood fields | Heavy weights, huge scale | Colour match, text mask, beat cut | Kick drums, stabs |
| **Mysterious** | Withhold, then release | `power2.in` then `expo.out` | Slow reveal from darkness | Dark, desaturated, one light source | Thin and small, then huge | Focal iris, text mask, freeze and rewind | Swells, reverse cymbals, silence before the drop |
| **Celebratory** | Fast payoff, then hold | `back.out`, confetti physics | Pull-back reveal | Full palette, gold accents | Bold display | Dolly-out reveal, object carry | Fanfare, sparkle, crowd-ish pads |
| **Nostalgic** | Slower, looping | `sine`, stepped | Fixed frame, film gate | Faded, grainy, limited palette | Era-specific display | Dither, film burn, paper fold | Tape wobble, chiptune, vinyl crackle |

## Mismatches to avoid

- Calm or premium with more than about 1.5 cuts per second, or with `back` / `elastic` eases.
- Urgent with holds longer than 2 s (except one deliberate pause before the payoff).
- Trustworthy with glitch or distortion transitions.
- Playful with a monochrome palette and no secondary colours.
- Any tone with more than two accent colours in one shot.

## Changing tone inside one film

Tone can shift. A common arc: pain is *urgent*, the reveal is *bold*, the proof is *trustworthy*, the CTA is *warm*. Record the tone per shot in the ledger. A film that holds one tone for more than about 45 s is not wrong, but ask whether it is intended.
