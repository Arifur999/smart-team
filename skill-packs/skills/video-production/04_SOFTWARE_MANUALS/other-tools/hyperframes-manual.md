---
title: HyperFrames Manual (House Notes)
section: 04_SOFTWARE_MANUALS/other-tools
type: reference
confidence: verify-first
sources: [hyperframes-repo, saas-motion-kit, herk-edit-kit]
updated: 2026-10-26
---

# HyperFrames: house notes

HyperFrames (HeyGen, Apache 2.0) renders plain HTML to video: headless Chrome seeks each frame, FFmpeg encodes. No build step. Built for agents.

Facts below were read from `github.com/heygen-com/hyperframes` (main) on 2026-10-26. **The official `hyperframes` skill is the authority for authoring rules.** This file holds only what we need to plan, the rules people break most, and how it fits our workflow.

## Setup

- Needs Node 22+ and FFmpeg on PATH. Chrome: `npx hyperframes browser ensure`. Health check: `npx hyperframes doctor`.
- Windows without FFmpeg: `winget install Gyan.FFmpeg`, then open a new terminal.
- Official skills (install once):
  - `npx skills add heygen-com/hyperframes`, or as a Claude Code plugin: `claude plugin marketplace add heygen-com/hyperframes`, then `claude plugin install hyperframes@hyperframes`
  - Update: `npx hyperframes skills update`
- Skills: `hyperframes` (read first: contract and work loop), `hyperframes-cli`, `hyperframes-registry` (about 450 blocks and components), `media-use` (TTS, transcribe, music, SFX, cutouts, grading, beats), `figma`, `slideshow`, `remotion-to-hyperframes`.

## Work loop

```bash
npx hyperframes init <dir> --resolution portrait     # landscape | portrait | square, -4k variants; --video/--audio to start from media
npx hyperframes capture <url> -o <dir>                # pull a real website (brand, UI, copy) into a working folder
npx hyperframes preview                               # Studio, port 3002
npx hyperframes check --json                          # the gate: lint + runtime + layout + contrast. Fix every error
npx hyperframes snapshot --review                     # PNGs of key frames + REVIEW.md. Look at them
npx hyperframes render -q draft -o renders/draft.mp4
npx hyperframes render -q high --resolution portrait-4k -o renders/final-4k.mp4
```

- Render only after the user approves the preview or draft. After the final render, confirm `ffprobe` duration equals the root `data-duration`.
- `lint`, `validate`, `inspect`, `layout` are older names; use `check`.
- Render flags: `--format mp4|webm|mov|gif|png-sequence|hls`; `-q draft|looks|standard|high` (`looks` is default, CRF 16; `delivery` = `high`); `--resolution` supersamples to a preset (same aspect, whole multiple); `--fps`; `--crf`; `--workers` (about 256 MB each); `--docker --strict` for reproducible renders; `--variables`, `--batch rows.json` for variants.
- Transparency: WebM or MOV (ProRes 4444) with `background: transparent` on the root.

## Rules people break most

1. Every timed element: `class="clip"`, `data-start`, `data-duration` (seconds, local to the file). The root also needs `data-composition-id`, `data-duration` (the video length), `data-width`, `data-height`.
2. One **paused** GSAP timeline per composition, registered after its tweens: `window.__timelines["<data-composition-id>"] = tl`. Never `tl.play()`, never add a scene timeline to the root.
3. Forbidden: `Date.now()`, unseeded `Math.random()`, network fetches, timers, `repeat: -1`.
4. Never tween `display`, `visibility` or `autoAlpha` on a `.clip`; animate a child. No CSS `transform` on an element GSAP also transforms. Use `fromTo` in scenes.
5. Never play, pause or seek media yourself. A `<video>` with sound needs `data-has-audio="true"`, otherwise `muted`; add `playsinline`. Every `<audio>` needs an `id` or it is left out of the mix.
6. `data-track-index` is only a Studio lane. Paint order is CSS `z-index`.
7. An end state exactly at the end time is not rendered. Land it a frame earlier.
8. A scene whose timeline ends early holds its last frame. A host slot shorter than its video goes blank (lint `subcomposition_blanks_before_host`): make each slot span its visible time.
9. Scene host id = scene root id = timeline key. A mismatch makes every scene wait 45 s.
10. Fonts: only the bundled families resolve by name (Inter, Montserrat, Poppins, Roboto, Open Sans, Lato, Oswald, Outfit, Nunito, Playfair Display, EB Garamond, JetBrains Mono and a few more). **No Bengali font is bundled**: add Noto Sans Bengali, Hind Siliguri or similar with `@font-face` in `assets/fonts/`.
11. Asset paths are root-relative (`assets/...`), also inside scenes.
12. No CSS filters on footage; use `media-treatment`.
13. A 3 s+ stretch with no visible change fails `check` (`sweep_static`). This matches our "every shot moves" rule.

Safe areas: content inside 90% action-safe, key text and captions inside 80% title-safe. Studio draws the guides.

## Media tools (`media-use`)

- Free and local: TTS (Kokoro), `transcribe` (whisper), music generation, offline SFX set, `remove-background` (text behind the speaker), `beats --json` (beat grid), `normalize-audio`.
- **Transcribe:** set the model and language explicitly. An English-only model, or the wrong default, can translate non-English speech into English. For Bangla use a multilingual model and proofread every line.
- **Licence check before client use.** Local music generation models are often non-commercial (MusicGen weights are CC BY-NC). Check each model's licence and record it in `notes.md`.

## Registry blocks

`npx hyperframes catalog --query "whip" --json`, then `npx hyperframes add <name> --json`. Blocks install as editable source in `compositions/`. Use them for speed; tune them to the tone and the variety ledger so the film does not look like the catalogue.

## Where it fits

Default engine for agent-built motion films, captions and graphics over footage, website-to-video, and batch variants. Remotion when the project is already React or Remotion. ffmpeg for everything around them.
