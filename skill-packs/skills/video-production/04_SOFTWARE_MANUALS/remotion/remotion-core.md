---
title: Remotion Core Manual (House Notes)
section: 04_SOFTWARE_MANUALS/remotion
type: reference
confidence: verify-first
sources: [remotion-repo, own-synthesis]
updated: 2026-10-26
---

# Remotion: house notes

Remotion renders video from React components. A video is a function of the current frame. Facts below were read from `github.com/remotion-dev/remotion` (v4.0.539) on 2026-10-26. **The official skills are the authority for API details**; this file holds what we need to decide and the mistakes that cost renders.

## Licence first

Free for individuals, non-profits, and for-profit organisations with **up to 3 employees**. Anyone else needs a Company License (remotion.pro). Check `LICENSE.md` in the repo before client work and note the answer in the project's `notes.md`.

## Setup

- Official skills: `npx skills add remotion-dev/skills`. Start with `remotion-best-practices` (router); others include `remotion-create`, `remotion-markup` (rule files for transitions, timing, fonts, audio, SFX, voice-over, captions, 3D, motion blur), `remotion-captions`, `remotion-render`, `remotion-studio`, `remotion-multimedia`.
- New project: `npx create-video@latest --yes --blank --no-tailwind <dir>`, then `npm i`.
- Packages: `npx remotion add @remotion/media` (and `@remotion/transitions`, `@remotion/captions`, ...).

```bash
npx remotion studio                                   # preview first
npx remotion still <id> out/frame.png --frame=30      # check type and layout before a long render
npx remotion render <id> out/frames --frames=0,30,90 --image-format=png
npx remotion render <id> out/video.mp4                # only when the user asks for the render
```

## Rules that matter

1. **All motion from `useCurrentFrame()`.** CSS `transition`/`animation` and Tailwind animation classes do not render correctly. Call `useCurrentFrame()` in the smallest component that needs it.
2. Convert seconds with `fps` from `useVideoConfig()`. Clamp `interpolate` with `extrapolateLeft/Right: "clamp"`.
3. **Media:** `<Video>` and `<Audio>` now come from `@remotion/media` (prefer over `<OffthreadVideo>` for new work). `volume` can be a function of frame. Reverse playback is not supported. Files go in `public/` and load via `staticFile()`.
4. **Duration from data:** `calculateMetadata` returns `durationInFrames`, `width`, `height`, `fps`, `props`. Use it for clip-length or transcript-driven videos instead of hard-coding.
5. **Loading:** wait for fonts and data with `useDelayRender()` (`delayRender`/`continueRender`).
6. **Transitions:** `@remotion/transitions` `<TransitionSeries>` with presentations from subpaths (`@remotion/transitions/fade`, `slide`, `wipe`, `flip`, `clock-wipe`) and `linearTiming`/`springTiming`. Transitions overlap scenes, so total length = sum of sequences − sum of transitions. `<TransitionSeries.Overlay>` (light leaks) does not shorten it.
7. **Determinism:** no unseeded randomness or wall-clock time. Remotion ships a seeded `random(seed)` helper (verify in the docs for your version).
8. Source video must be constant frame rate (convert VFR first; ffmpeg cookbook).
9. Heavy blur and shadows slow renders; `@remotion/effects` provides blur, glow and vignette as effects.

## Fonts

`@remotion/google-fonts` or local fonts (see the `remotion-markup` rule files). For Bangla text load a Bengali font explicitly and test a still with conjuncts before animating.

## Where it fits

Use Remotion for React projects, data-driven batch videos (many variants from JSON), and when the user already has Remotion code. Otherwise HyperFrames is our default. Patterns for our video types: `remotion-patterns.md`.
