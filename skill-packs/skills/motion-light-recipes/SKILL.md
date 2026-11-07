---
name: motion-light-recipes
description: Recipes for light that reads as real light in HTML/CSS motion graphics (HyperFrames) - volumetric cones and spotlight beams with soft edges, falloff and bloom, lit textured surfaces, haze, moving light during holds, white floods, and logos revealed in light - with numbers and self-checks. Use whenever a video has spotlights, beams, glows, light sweeps or a "premium lit" look.
---

# Light that looks like light

A flat white triangle is not a beam. Real light has a bright core, a soft body, a wide faint halo, falls off
with distance, blooms at the source and lights what it touches. Every recipe below is in % of frame width (W)
so it scales to any size. At 1920 wide, 1% W = 19 px.

## 1. Volumetric cone (spotlight beam)

Three stacked copies of the cone shape (a CSS `clip-path: polygon()` or an SVG path), from the lamp outward:

| Layer | Blur | Opacity | Notes |
|---|---|---|---|
| core | 0.4% W | 0.95 | narrow (60% of the cone angle), whitest |
| body | 1.5% W | 0.7 | full cone angle |
| halo | 4% W | 0.35 | cone angle +20%, the glow you feel more than see |

- Blend `mix-blend-mode: screen` (or `plus-lighter`) on a dark stage.
- **Falloff**: a mask on each layer, `linear-gradient(to <beam direction>, #000 0%, #000 35%, transparent 100%)`
  (mask = keep), so the beam fades along its length. The reference decides how far it reaches.
- **Edge softness check**: across the beam edge, luma should go from 90% to 10% over at least 2% W. If it
  does it in 2-3 px, the blur is missing (the classic "flat polygon" defect).
- Put the blur on a wrapper with `filter: blur()`; never animate the blur radius (expensive, flickers).

## 2. Bloom at the source

A small duplicate of the lamp head, `filter: blur(1% W)`, opacity 0.8, screen blend, plus a radial gradient
disc (`radial-gradient(circle, #fff 0%, rgba(255,255,255,.35) 25%, transparent 60%)`, about 6% W across).
If HyperFrames grading is used, its bloom variable can replace the disc.

## 3. Lit surface ("bubbly" or textured light pool)

The texture exists only where light falls:
- Texture: SVG `feTurbulence` (baseFrequency 0.006-0.012, numOctaves 2) into `feDiffuseLighting`
  (surfaceScale 3-6, a distant light from the lamp's side), or a pre-made height-map PNG.
- Reveal it with the same cone mask as the beam, at 25-45% opacity, `multiply` or `overlay` over the pool.
- The texture drifts 1-2% W over a beat; it should never look like a static wallpaper.

## 4. Haze and grain

A full-frame noise layer (`feTurbulence` baseFrequency 0.8, or a grain PNG) at 8-15% opacity, screen, visible
only inside the light (masked like the surface). Animate its offset every 2 frames for living grain.

## 5. Holds: titles still, light alive

When a title lands, the TITLE stops dead. The light keeps moving: rotate the cone 3-5 deg around the lamp
over the hold (`sine.inOut`), drift the pool 2-4% W, breathe the halo opacity +-10%. A hold where nothing
moves for 1 s or more reads as a frozen frame (and the critic fails it, MP3).

## 6. Swings and moves

- Beam swing to a new position: 0.4-0.6 s, `power3.inOut`, the lamp head rotates with it.
- The title appears as the pool arrives: start the text fade 0.08 s after the beam passes its spot,
  0.3-0.4 s, `power2.out`, with a 2-4% upward drift. Text is lit by the beam (it is darker at the edge of the pool).
- A lamp switching on: 0 to full in 2-3 frames with a single 1-frame overshoot (flicker), halo 2 frames later.

## 7. White flood (finale)

The light grows until it fills the frame: scale the halo and body 6-10x over 0.35-0.45 s, `power2.inOut`,
while a full-frame white layer fades 0 to 1 over the last 0.2 s. No cut through black unless the reference
has one. The end card sits on the white.

## 8. Logo in light

The logo is never rotated, skewed, stretched, recoloured or banded. Reveal it with light instead: a light
sweep (a soft white gradient bar, 15% W wide, screen blend) passing over it in 0.5 s, and/or a mask that
grows from the pool. Keep it at 0 deg with its exact aspect.

## 9. 3D tier (only if the plan asks)

When CSS cannot get the volume: a Three.js scene with a SpotLight, volumetric cone shader and bloom pass,
rendered inside HyperFrames, or a Blender plate rendered to PNG sequence and placed as video.

## Self-check (do it on stills, before animating)

- [ ] Edge falls off over >= 2% W (zoom a crop across the beam edge).
- [ ] Brightest point is the lamp/bloom; the beam fades with distance.
- [ ] Glow vs reference: `measure.py` (video-qa) glow ratio 0.6-1.8, light cover close to the reference's.
- [ ] Texture only inside the light, and moving.
- [ ] H.264 check: dark gradients do not band (use a radial gradient or add 2-3% grain).
