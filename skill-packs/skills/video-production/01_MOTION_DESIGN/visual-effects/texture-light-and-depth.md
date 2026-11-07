---
title: Texture, Light and Depth
section: 01_MOTION_DESIGN/visual-effects
type: recipe
confidence: creator-tested
sources: [herk-edit-kit, own-synthesis]
updated: 2026-10-26
---

# Texture, light and depth

Effects are seasoning. Use the fewest that make the piece feel like one world.

## Unifying texture

Pick **one** recurring texture and use it in every scene: a perspective grid, dot grid, grain, or a repeated mark such as a plus sign at grid intersections. Consistency is what makes it look designed.

## Effect kit

| Effect | What it does | Settings guidance |
|---|---|---|
| **Vignette** | Pulls the eye to the centre | Radial gradient, transparent core to dark edge; fixed over all content; can breathe slowly (opacity 0.85 ↔ 0.95 over ~4 s) |
| **Grain** | Removes digital flatness, hides banding | Fine, low opacity; same on every scene; animate by stepping, not smooth drift |
| **Perspective grid floor** | Depth, tech feel | Thin lines at about 5% white on black, tilted about 60°, slow scroll for parallax |
| **Glow / halo** | Emphasis | Soft double shadow on emphasis only |
| **Liquid-glass card** | Premium UI feel | Translucent diagonal gradient, background blur with a little saturation, a 1 px light inner highlight on the top edge (the highlight is what sells it) |
| **Light beam / cone** | Finale, reveal | Conic gradient from a top point, blurred, low opacity |
| **Sparkle particles** | Life in static scenes | 20–40 small marks, random opacity flicker with a fixed seed |
| **Chromatic split** | Energy at a transition | Slight RGB offset for a few frames at the cut |
| **Motion blur** | Speed, hides seams | Blur only along the direction of motion, ramp up then down |
| **Film burn / light leak** | Nostalgic, celebratory | Short flash, warm colours, once |

## Depth cues without 3D

- Scale: nearer = bigger.
- Blur: farther = softer.
- Parallax: nearer layers move faster.
- Overlap: nearer layers cover farther ones.
- Light: nearer = brighter.
- Shadow: soft shadow below a floating element.

## Restraint rules

- If you can name the effect in the finished piece, it is probably too strong.
- No more than three active effects in one frame.
- An effect that appears in only one scene reads as a mistake. Use it everywhere or nowhere.
- 3D: pre-render complex materials (chrome, refraction) as video or sequences. Use CSS 3D for planar rotation. Do not rely on live WebGL for final renders.
- Legibility beats atmosphere. If the glow kills text contrast, cut the glow.
