---
title: Intake Questionnaire
section: 00_INTAKE
type: recipe
confidence: established
sources: [own-synthesis, saas-motion-kit]
updated: 2026-10-26
---

# Intake questionnaire

The brief decides most of the quality. A wrong guess here costs a rebuild later; a question costs ten seconds. But a long form up front exhausts people, so ask in short rounds and never ask what you can find out yourself.

## How to ask

- **Read first.** Pull every answer you can from the user's message, attached files, the script, and any links. Then ask only what is missing.
- **Rounds of at most four questions.** Use the question tool with options when it exists (put the recommended choice first). Free text only for things like story and paths.
- **Skip what does not apply.** No voice questions for a silent motion loop; no footage questions for a pure motion film.
- **"You decide" is an answer.** Pick from the tone matrix and the defaults below, and mark the field `(assumed)` in the brief.
- **Measure, do not ask.** Resolution, frame rate, duration, audio channels, VFR and HDR come from `scripts/probe_assets.py`.
- **Read the links yourself.** A product website gives brand colours, fonts, logo, product UI and real claims. Fetch it (HyperFrames `capture <url>` pulls a site into a working folder). Ask the user only to confirm what you found.
- **Stop when the required fields are filled.** Optional fields take defaults.

## Round 1: the job

If the user already says they have footage or other materials, make the path one of the four questions here, so you can probe the files while they answer the rest.

| Ask | Why it matters | Options to offer |
|---|---|---|
| What are we making? | Picks the track and the playbook | Reel/Short from my recording · YouTube video edit · Promo/ad · Explainer · Motion graphic/logo · Other |
| Where will it play, and what shape? | Aspect, safe zones, loudness target | Reels/TikTok/Shorts 9:16 · YouTube 16:9 · Feed 4:5 or 1:1 · Several (list them) |
| How long? | Script length, pacing | 15 s · 30 s · 60 s · 2-5 min · Match the material |
| Which language for voice and on-screen text? | Fonts, transcription model, caption rules | Bangla · English · Bangla voice with English text · Other |

## Round 2: story

| Ask | Why it matters |
|---|---|
| In one sentence, what should the viewer understand, feel, and do after watching? | Becomes the tone sentence and the single CTA |
| Who is watching? | Vocabulary, pace, what counts as proof |
| What story material exists? Script / raw recording / bullet points / only an idea | Decides whether you write the script, cut a recording, or both |
| Tone? (offer 3-4 rows from `02_VIDEO_EDITING/storytelling-and-pacing/tone-matrix.md` that fit the job) | Sets speed, eases, colour, type, transitions and sound in one decision |

If you will write the script: narration runs about 2.3-2.7 words per second for a normal pace (fast short-form reaches 4+). A 30 s narrated video holds about 70-80 words. Say this when the user's script is too long for the length.

## Round 3: materials (file paths and links)

Ask for paths in one free-text question. List the kinds so the user does not forget any:

- Footage folder or files (recordings, screen recordings, B-roll)
- Brand kit: logo (SVG or PNG with transparency), colours, fonts, style guide
- Voice-over file, music, SFX they already have
- Source website or product links (what should be pulled from them: UI, copy, screenshots, colours)
- Reference videos: link or file, and **what to borrow from each** (pace, transitions, captions, colour, music mood). Grammar only, never assets.
- Anything that must appear (offer, phone number, address, product shot) and anything that must not

Then run `python scripts/probe_assets.py <all paths>` (add `--scenes` for reference clips) and save the output as `inventory.md`. Report problems in plain words: "Your main clip is variable frame rate; I will convert it before cutting."

## Round 4: sound

| Ask | Options to offer |
|---|---|
| Voice? | My recording · Generate a voice-over (TTS) · No voice, music-led · Already in the footage |
| Music? | I have a track (path) · Pick licensed music for me · Generate · No music |
| Sound effects? | None · Subtle (only real actions) · Rich (motion-film style) |
| Any music or voice you must avoid? | Free text, skip if none |

Before picking or generating music, check its licence fits the use (client and paid ads need a commercial licence). See `03_AUDIO_ENGINEERING/sound-design/music-selection-and-bed.md`.

## Round 5: delivery and working style

| Ask | Options to offer |
|---|---|
| Deliverables? | One MP4 · MP4 + SRT captions · Several aspect ratios · Transparent overlay (MOV/WebM) |
| Engine preference? | Let you decide (recommended) · HyperFrames · Remotion · ffmpeg only |
| How often should I stop for approval? | Brief, storyboard, draft, final (recommended) · Every stage · Only brief and final |
| Is the footage confidential (local processing only)? Deadline? | Yes/No · free text |

## Defaults when the user says "you decide"

| Field | Default |
|---|---|
| Shape | 9:16 1080×1920 for social; 16:9 1920×1080 for YouTube and web |
| Frame rate | Match the main footage; 30 fps for pure motion films |
| Length | 30 s promo, 45-60 s reel, as long as the material deserves for YouTube |
| Structure | Hook → Proof → Items → Payoff → CTA (talking head); Hook → Reveal → Proof → CTA (promo) |
| Captions | Burned-in, 1-3 word chunks, one style (`caption-style-rules.md`) |
| Loudness | Social −14 LUFS, true peak ≤ −1.5 dBTP |
| Engine | HyperFrames, unless the project is already Remotion |
| Gates | Brief, storyboard or story plan, draft, final |

## Closing the intake

1. Write `brief.md` from `project-brief-template.md`.
2. Show a summary of eight lines or fewer: what, for whom, the tone sentence, length and shape, materials found (with problems), sound plan, engine, gates.
3. List open questions and assumptions explicitly.
4. Wait for approval before any building.
