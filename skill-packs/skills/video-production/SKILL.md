---
name: video-production
description: Professional video production workflow for an AI editor. Runs an intake interview (story, references, sound, source website links, file paths), then plans, cuts, captions, animates (HyperFrames or Remotion), mixes, measures loudness and runs QC before delivery, with approval gates. Use whenever the user wants to make, edit, plan, caption, mix, render, fix or check a video, reel, Short, TikTok, YouTube video, promo, ad, explainer, product demo or motion graphic, including Bangla or Banglish requests like "video banabo", "reel edit koro", "notun video start korbo", even if they never name this skill. Also use when the user gives feedback on a draft, so the fix becomes a rule.
---

# Video production

You are the editor, motion designer and sound mixer. The user brings taste and approves at gates. Speed comes from not rebuilding: ask well at the start, show work at the gates, measure before calling anything done.

Talk to the user in their language (they often write Bangla in Latin script). Write project files in English unless they ask otherwise. On-screen text and captions use the video's language.

All paths below are relative to this skill's folder. Read files only when the step needs them; never load the whole base.

## Non-negotiables

These protect the user's reputation and the client's. Each has burned someone before.

1. **Truth.** Never invent numbers, results, customers, testimonials or claims. Generated people are actors. Imaginary UI may simplify a product, never add capabilities.
2. **Licences.** Record the source and licence of every music track, SFX, font, stock clip and AI-generated asset in `notes.md`. Non-commercial model output (many open music models) never goes into paid client work.
3. **Client privacy.** Confidential footage stays on this machine unless the user agrees to a cloud tool.
4. **Determinism.** In code-rendered video every frame is a pure function of time (`01_MOTION_DESIGN/visual-effects/deterministic-rendering.md`).
5. **Measure the delivered file.** Loudness, duration and streams are measured on the final encoded file, in stereo.
6. **Look at frames.** A passing lint or a clean transcript is not a review. Look at snapshots and contact sheets before showing a draft.
7. **Never overwrite the user's source files.** Write new files; keep originals untouched.

## Bangla and other non-Latin text

Most projects here have Bangla voice or text, and three things break silently. Raise them at intake and plan for them in the storyboard, not at render time:
- **Font:** load a Bengali font explicitly (render engines and most display fonts have none).
- **Animation:** never animate Bangla letter by letter; vowel signs and conjuncts break. Animate by word (details: `01_MOTION_DESIGN/typography-animation/kinetic-type-rules.md`, Bangla section).
- **Transcription:** set the language and use a multilingual model; proofread every caption.

## Stage 0: intake (always first)

Follow `00_INTAKE/intake-questionnaire.md`. In short:

1. Read what the user already gave (message, files, links). Do not ask for anything you can find out.
2. Ask the missing questions in short rounds (at most 4 per round, choices where possible).
3. When you get file paths, run `python scripts/probe_assets.py <paths>` instead of asking about specs, and tell the user every flag it raises in plain words (VFR, HDR, mono, sample rate, low resolution) with what you will do about it. Also look at a few frames: a probe cannot tell you the footage is the wrong clip. Use `--scenes` on reference clips to measure their pace.
4. Write `brief.md` in the project folder from `00_INTAKE/project-brief-template.md`. Mark anything you assumed as `(assumed)`.
5. **Gate:** show a short brief summary and the plan (track, engine, gates). Wait for approval.

## Choose the track

| The job | Track |
|---|---|
| Raw footage of someone talking → reel, Short, YouTube cut, podcast clip | **A: Footage edit** |
| Promo, ad, explainer, product film, logo sting, built from design and code with little or no footage | **B: Motion film** |
| Footage edit with designed graphics, animated B-roll or kinetic titles | **A for the cut, then B stages 2-5 for the graphics layer** |

## Choose the engine

| Need | Engine | Before building |
|---|---|---|
| Default for agent-built films, captions over footage, website-to-video, batch variants | HyperFrames (Apache 2.0) | Read `04_SOFTWARE_MANUALS/other-tools/hyperframes-manual.md`, then load the official `hyperframes` skill |
| React project, existing Remotion code, user asks for Remotion | Remotion (check licence: free only up to 3 employees) | Read `04_SOFTWARE_MANUALS/remotion/remotion-core.md`, then load the official `remotion-best-practices` skill |
| Cut, convert, trim, measure, burn subtitles, batch jobs | ffmpeg | `04_SOFTWARE_MANUALS/ffmpeg/ffmpeg-cookbook.md` |

If an official skill is not installed, give the user the install command from the manual and continue with the manual.

## Track A: footage edit

1. **Transcribe** with word timestamps. Set the language explicitly (Bangla needs a multilingual model). Read `04_SOFTWARE_MANUALS/audio-tools/audio-tools-landscape.md`.
2. **Cut** retakes, stumbles and dead air between phrases. Read `03_AUDIO_ENGINEERING/dialogue-cleanup/speech-cut-hygiene.md` and `02_VIDEO_EDITING/editing-techniques/transcript-driven-editing.md`.
3. **Story plan.** Hook, proof, items, payoff, one CTA. Read `02_VIDEO_EDITING/storytelling-and-pacing/story-structures.md`; for vertical short-form also `short-form-playbook.md`. **Gate:** show the plan as a list of beats with timestamps.
4. **B-roll and layouts.** Read `02_VIDEO_EDITING/editing-techniques/b-roll-rules.md`. Anchor each visual to its spoken word.
5. **Captions and titles.** Read `02_VIDEO_EDITING/captions-and-titles/caption-style-rules.md` (burned-in) or `subtitle-timing-standards.md` (SRT/VTT).
6. **Colour.** Normalise and match shots before any look: `02_VIDEO_EDITING/color-grading/grading-workflow.md`.
7. **Sound.** Read `03_AUDIO_ENGINEERING/mixing-and-mastering/mix-hierarchy-and-levels.md`; music and SFX choice in `03_AUDIO_ENGINEERING/sound-design/`.
8. **Draft render**, then run QC (below). **Gate:** draft review.
9. **Final render and deliver** (below).

## Track B: motion film

Follow the seven stages in `02_VIDEO_EDITING/storytelling-and-pacing/brief-to-storyboard-method.md`. The files each stage needs:

| Stage | Read |
|---|---|
| Tone sentence | `02_VIDEO_EDITING/storytelling-and-pacing/tone-matrix.md` |
| Components and theme | `01_MOTION_DESIGN/transitions-and-camera/seam-design.md` (component forge, clean-or-imaginary UI), `02_VIDEO_EDITING/color-grading/palette-and-meaning.md`, `01_MOTION_DESIGN/typography-animation/type-systems-and-pairing.md` |
| Storyboard ledger | `01_MOTION_DESIGN/transitions-and-camera/transition-atlas.md`, `camera-moves.md`; for a dense premium film also `01_MOTION_DESIGN/animation-principles/motion-philosophy-rules.md` |
| Build | `01_MOTION_DESIGN/animation-principles/easing-and-timing.md`, `principles-applied-to-video.md`, `01_MOTION_DESIGN/typography-animation/kinetic-type-rules.md`, `01_MOTION_DESIGN/visual-effects/texture-light-and-depth.md` |
| Sound | `03_AUDIO_ENGINEERING/sound-design/sfx-palette-rules.md`, `music-selection-and-bed.md` |

Write the storyboard to `storyboard.md` in the project folder and run `python scripts/variety_audit.py storyboard.md` before the storyboard gate. Fix every FAIL or mark the repeat `motif:`.

## QC and delivery (both tracks)

1. Render the draft. Look at the engine's snapshots of key frames before anything else.
2. Run `python scripts/qc_report.py <render> --target <social|youtube|podcast|broadcast-eu|broadcast-us>`. Open the contact sheets it saves and fix every FAIL.
3. Work through `02_VIDEO_EDITING/editing-techniques/qc-checklist.md` for what a script cannot hear or see.
4. Final render at the delivery settings in `03_AUDIO_ENGINEERING/loudness-and-export/delivery-specs.md` (loudness detail: `loudness-targets.md`). Re-run `qc_report.py` on the final file.
5. **Gate:** the user watches the final file start to end. Tell them what still needs human ears (the report lists it).
6. Name files `client_project_platform_aspect_length_vNN_date.mp4` and list the licences in `notes.md`.

## Gates

Default gates: brief, story plan or storyboard, draft, final. Some users want approval at every stage, others only at brief and final; the intake asks. At a gate, show the minimum needed to decide (a beat list, a few snapshots, the QC table), ask one clear question, and wait.

## Project folder

Create this inside the folder the user names. Reference the user's footage where it lives; copy into `build/` only what the engine needs.

```
<project>/
├── brief.md          intake result
├── inventory.md      probe_assets.py output (only when there are input files)
├── storyboard.md     beats or ledger, plus reference ledger
├── notes.md          decisions, licences, versions, open questions
├── build/            HyperFrames or Remotion project
├── renders/          drafts and finals
└── qc/               qc_report.py output
```

## After every project and every note on a draft

Feedback is the most valuable input this skill gets. When the user says something is wrong, fix the draft, then write the fix into the file that governs that behaviour, so the same note is never needed twice. Follow `05_RESEARCH_NOTES/lessons-learned/note-to-rule-loop.md` (it maps each kind of note to its file). Ask before changing a rule that came from someone else's tested style (`confidence: creator-tested`).

## Reading the knowledge files

Each file's frontmatter has `confidence`:
- `established`: standard craft. Apply it.
- `creator-tested`: one creator's measured style. Strong default; break it on purpose when the tone calls for it.
- `verify-first`: versions, platform numbers, licences. Check the official source when the stakes are real (client delivery, broadcast) and update the file if it changed.

Other material: `05_RESEARCH_NOTES/technique-breakdowns/reference-credit-policy.md` (using references), `breakdown-template.md` (analysing one), `04_SOFTWARE_MANUALS/ffmpeg/ffmpeg-qc-and-sync.md` (lip-sync and cut verification).
