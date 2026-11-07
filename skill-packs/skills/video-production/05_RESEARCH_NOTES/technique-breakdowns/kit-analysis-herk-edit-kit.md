---
title: Kit Analysis — herk-edit-kit
section: 05_RESEARCH_NOTES/technique-breakdowns
type: reference
confidence: creator-tested
sources: [herk-edit-kit]
updated: 2026-10-26
---

# Kit analysis: herk-edit-kit

**Credit:** `nateherkai/herk-edit-kit` by Nate Herk · github.com/nateherkai/herk-edit-kit · Analysed 2026-10-26. Check the repo's licence before reusing any text, templates, or assets. We use ideas and measurements only.

## What it is

A video-editing kit for Codex and Claude Code, built on HyperFrames. Bring your own footage. It cuts dead air, flags mistakes, plans the story, and builds motion graphics. Described as having 15 skills, 406 draft motion-graphics cards in two styles, two scene templates, transcription and cutting tools, short-form validators, and 12 teaching projects.

## Parts and what we took

| Part | What it is | What we took |
|---|---|---|
| `docs/EDITING-PLAYBOOK.md` | How his videos are edited with AI; house style numbers; B-roll, caption, and sound rules; QC; lessons | Almost every rule in sections 02 and 03 (rewritten) |
| `MOTION_PHILOSOPHY.md` | The 11 laws, a visual vocabulary, GSAP recipes, a pre-flight checklist, anti-patterns | Laws, pacing numbers, seam and slot rules (adapted by tone) |
| `AGENTS.md` / `CLAUDE.md` | Shared agent instructions | Idea: short always-on instructions that point to deeper files |
| Skills (edit-video, cut-silences, cut-mistakes, video-storytelling, short-form-edit, motion-showreel, style-library...) | One job per skill; helper scripts and references | Skill split by job |
| `style-library/` and `style-templates/` | Card library with a registry; whole-scene templates | Idea: a searchable registry of reusable pieces |
| `docs/WORKFLOW.md`, `PROMPTS.md`, `SHORT-FORM.md`, `STORYTELLING-WORKBOOK.md`, `VERIFICATION.md` | Step-by-step workflow, prompt recipes, validators | Not read in full. Read next if we build skills |

## The most valuable idea: the note-to-rule loop

Every note he gives on a draft becomes a permanent rule in a skill, so he never gives the same note twice. See `05_RESEARCH_NOTES/lessons-learned/note-to-rule-loop.md`.

## Measured house style (one creator, 27 reels)

Speech starts within about 0.1 s. Shots average roughly 1.1–1.4 s, none over about 2.8 s. First cut at 0.6–1.0 s. Speaker on screen about 45% of the time. About 4.0–4.7 words per second. Music about 11 dB under voice. Master near −14 LUFS, true peak at or below −1.5 dBTP.

## Cautions

- **One creator's style, one platform mix, one niche.** Numbers are a starting point. Re-measure with the best content from our own clients.
- Tools in the kit use paid services (cloud transcription, video generation). Our local-first rule for client footage applies.
- The kit's "AI watch tests" are noisy. Verify on real frames.
- A raw recording caps the edit. Script the hook before recording.
- The kit includes public showcase videos. Do not reuse their assets.

## Candidate additions later

- Our own measured style for dental and local-business reels.
- A caption contrast checker script.
- A lip-sync frame check script.
