---
title: Audio and Transcription Tools — What to Use for What
section: 04_SOFTWARE_MANUALS/audio-tools
type: reference
confidence: verify-first
sources: [own-synthesis, herk-edit-kit]
updated: 2026-10-26
---

# Audio and transcription tools: what to use for what

Choose the lightest tool that does the job. Prices, limits, and features change. Check before committing a workflow to any tool.

## By job

| Job | Options | Notes |
|---|---|---|
| **Transcription with word timestamps** | A cloud speech-to-text service (the Herk kit uses ElevenLabs Scribe), OpenAI Whisper (cloud or local), a local Whisper build | Word-level timestamps are essential for cutting and captions. You can also supply an existing word-level transcript |
| **Cut and convert audio** | ffmpeg | Scriptable, repeatable |
| **Edit audio by hand** | A free editor like Audacity; a DAW such as Reaper; the audio page inside DaVinci Resolve; Adobe Audition | Pick one and learn it. Do not mix five |
| **Repair noisy or damaged dialogue** | A dedicated repair suite (iZotope RX is the usual standard) or built-in noise reduction | Heavy repair is expensive in time. Prevent problems at recording |
| **Speech enhancement (AI)** | Cloud or local speech-enhancement tools | Can invent artefacts. Always A/B against the original |
| **Loudness measurement** | ffmpeg `ebur128`, a loudness meter plug-in (several free ones exist), the loudness page in your editor | Measure the final file |
| **Music and SFX libraries** | Licensed libraries, royalty-free libraries, your own synthesised sounds | Record the licence per file |
| **Synthetic voice** | Text-to-speech services | Check the licence for commercial use; label as synthetic where required |
| **Beat and tempo analysis** | A beat-detection script or tool | Measure the real track, do not trust a guessed BPM |

## Local vs cloud

| | Local | Cloud |
|---|---|---|
| Privacy | Footage never leaves your machine | Footage is uploaded; check the terms for client material |
| Cost | Free after setup; needs a capable machine | Pay per use |
| Speed | Depends on your hardware | Usually fast |
| Accuracy | Good with larger models | Often excellent, varies by language |

**Client footage rule:** if a client's recording is confidential (a dental clinic's patient material, for example), do not send it to a cloud service without their agreement. Use local tools.

## Transcription tips

- Request word-level timestamps and keep the raw JSON.
- Proofread names, brands, and numbers.
- Expect the timestamps to mark word ends a bit early. Cut after the word has decayed.
- For non-English or mixed-language audio, test a short clip first and pick the tool that handles that language best.
- **Bangla:** always set the language explicitly. Never use an English-only (`.en`) Whisper model; some tools translate to English when the model or language is wrong. Small multilingual models are weak on Bangla; use a large model or a cloud service with Bengali support, and proofread names, numbers and English loanwords. Bangla-English code-switching often comes back with English words transliterated into Bengali script; decide which script the captions use and fix them consistently.

## Built into the render engines

HyperFrames (`media-use` skill) has local transcription, TTS, music generation, SFX, background removal and beat detection. Remotion has `@remotion/whisper-webgpu` and `@remotion/captions`. Check the licence of each model before client use (see `hyperframes-manual.md`).

## A minimal toolkit

For one person starting out: ffmpeg + one free audio editor + one transcription tool + a loudness check. Add more only when a real problem demands it.
