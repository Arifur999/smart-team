---
title: Software Manuals — Section Guide
section: 04_SOFTWARE_MANUALS
type: reference
confidence: verify-first
sources: [own-synthesis, herk-edit-kit, saas-motion-kit]
updated: 2026-10-26
---

# 04 Software Manuals

Working notes for the tools in this ecosystem. These are **our** quick manuals: the commands and patterns we actually use, plus the gotchas. They do not replace official docs.

| Folder | Covers |
|---|---|
| `remotion/` | Building video as React code with Remotion |
| `ffmpeg/` | Command-line cookbook and verification recipes |
| `audio-tools/` | Which audio and transcription tool to use for which job |
| `other-tools/` | HyperFrames, and how skills and this knowledge base plug into Claude Code and GitHub |

## Version rule

Tool flags and APIs change. Every file here is `verify-first`. When you use a command and it works, record the tool version in `05_RESEARCH_NOTES/lessons-learned/`. When it fails, fix the file.

## Choosing a render engine

| Need | Use |
|---|---|
| Agent-built motion films, captions and graphics over footage, website-to-video, batch variants (default) | HyperFrames (Apache 2.0) |
| React projects, existing Remotion code, data-driven variants in React | Remotion (licence: free only up to 3 employees) |
| Cutting, converting, measuring, batch tasks | ffmpeg |
| Anything with a heavy visual timeline and hand-tuned grading | A desktop editor (not covered here) |

Both engines ship official agent skills; install commands are in each manual. The manuals here hold house notes and the gotchas that cost us renders.

## Safety notes

- Never put API keys in files tracked by Git. Use an untracked `.env` and a committed `.env.example`.
- Do not run unknown scripts from the internet with your footage on the machine.
- Check every licence (the tool, fonts, music, stock) before commercial use.
