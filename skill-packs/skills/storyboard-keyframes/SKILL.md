---
name: storyboard-keyframes
description: Build a video's look before its motion - pose every storyboard frame as a final-look still in HyperFrames (light, texture, type, logo, brand), snapshot them at their poster times, pair each with its reference frame and fix until they match. Use for the Style frames stage, or whenever a motion piece needs approved stills first.
---

# Style frames first, motion second

Motion hides problems for a moment and then shows them for seconds. So the team agrees the LOOK on stills,
and only then animates. Your approved stills become Storm's contract: at every poster time the final render
must look like your still (the critic flags SSIM under 0.92).

## Inputs

- `02-plan/storyboard.md` (one frame per beat: id, poster time, what it reads, light recipe)
- `02-plan/beat-plan.json`, `02-plan/SPEC.md` (with the ALLOWED line)
- `01-source/style-spec.md`, `01-source/reference-frames/`, `01-source/brand-facts.md`
- the brand kit skill if loaded (tokens, fonts, logo files); house rules in your prompt

## Build

1. In `build/`, set up (or keep) the HyperFrames project. Put the palette and fonts from brand-facts as
   root variables. Load the real brand font files (woff2) or the named web font; never a look-alike.
2. For each frame, place its elements in their **landed** state at its poster time: final copy (verbatim),
   final size and position, the light recipe from `motion-light-recipes`, texture, logo. No entrance or exit
   animation yet; a static timeline where everything is visible at its poster time is enough.
3. Respect the SPEC's ALLOWED line over the hyperframes BANNED defaults (for example a black stage and glow
   when the reference has them).
4. Never transform the logo (no rotation, skew, stretch, band or effect on it). Light may pass over it.

## Snapshot, pair, look

Snapshot every poster time in ONE run, named so the time is in the file name:

```bash
cd build && npx hyperframes snapshot --at 1.20,3.60,5.10 --no-end --output ../03-storyboard/vR/raw
```

Rename each PNG to `<frame id>_t<poster time>.png` (for example `F03_t5.10.png`) in
`03-storyboard/vR/stills/`, then:

```bash
python "<this skill's base directory>/scripts/pair_sheet.py" --stills 03-storyboard/vR/stills --ref 01-source/ref.mp4 \
  --beat-plan 02-plan/beat-plan.json --out 03-storyboard/vR
```

Open `sheet.png`, every `pairs/*.png` and `phone-sheet.png` with the Read tool. For each pair, compare in this
order: light (shape, softness, falloff, bloom), texture, type (font, weight, size, colour, pairing), placement
relative to the light pool, logo, background. Write down each difference with a number.

## Fix loop

- At most 2 passes per frame. Change one thing at a time and re-snapshot only that time.
- `npx hyperframes check --json` must show zero errors at the end. Do not paper over layout errors with
  `data-layout-allow-*` on a scene root; fix the layout.
- On a redo round (fixes S1, S2... routed to you), redo ONLY the named frames; copy the other approved stills
  unchanged into the new `vR` folder so the set is complete.

## Reply

`{"stage":"storyboard","summary":"...","frames":[{"id":"F01","still":"03-storyboard/vR/stills/F01_t1.20.png","pair":"03-storyboard/vR/pairs/F01_t1.20.png"}],"fixes":[{"id":"S1","status":"done","what":"..."}]}`
