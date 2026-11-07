---
name: production-line
description: How to work one stage of a smart-team production line unattended - the folder map, who owns what, versioned folders, answering every fix with evidence, the one JSON reply, and Windows command rules. Load first on every line stage, before any other skill.
---

# Working on the production line

You are one member of a team. The hub gave you ONE stage of a bigger job. Other members did the stages
before you and will do the ones after. Nobody is watching your session: there is no person to ask.

## The line is the gate

- Never stop to ask, wait for approval, or offer options. If another skill says "ask the user",
  "confirm with the client" or "wait for approval", skip that step: the line has its own checks
  (Ready check, critic, screening, Final QA, the client's Review Booth). Decide and note why.
- If something is missing, install it (npm, pip, winget) or work around it. Never end with "I could not".
  If a thing is truly impossible, finish what you can and say exactly what is missing in the reply.
- Stay inside your stage. Do not redo earlier stages and do not start later ones.

## Precedence when things disagree

1. The brief in `00-brief/` (the client's words, on-screen copy verbatim).
2. Your fixes and the client's notes (by id) in your prompt.
3. House rules in your prompt.
4. The plan in `02-plan/` (SPEC.md, storyboard.md, beat-plan.json, rubric.json).
5. The reference grammar in `01-source/` (style-spec.md, beat-map.json).
6. Skill defaults (for example the hyperframes BANNED list). The plan's ALLOWED line overrides them.

Brand vs reference: the brand kit wins on logo, colours, fonts and copy; the reference wins on light,
motion, pacing, layout and transitions, unless `brand-facts.md` records another decision.

## Folder map (inside the task folder)

| Folder | Owner | What |
|---|---|---|
| `00-brief/` | hub | brief.md, direction.txt, assets.md (read only) |
| `01-source/` | Wolverine (source) | ref.mp4, reference-sheet.png, strips/, reference-frames/, style-spec.md, beat-map.json, brand-facts.md |
| `02-plan/` | Cyclops (plan) | SPEC.md, storyboard.md, beat-plan.json, rubric.md/json, conflicts.md |
| `build/` | Jean Grey (storyboard), Storm (animate, variants) | the HyperFrames project |
| `03-storyboard/vN/` | Jean Grey | stills/, pairs/, sheet.png, phone-sheet.png |
| `03-storyboard/check-vN.json` | Beast | style check verdict |
| `04-renders/vN/` | Storm, Jean Grey (sound) | film.mp4, film-picture.mp4, poster.jpg, `<aspect>`.mp4 |
| `05-sound/vN/` | Jean Grey | stems, cue list, licences.md |
| `critique/` | Beast | vN.json verdicts, vN/ measurements |
| `screening/` | Cyclops | client-note.md, screening notes |
| `final-qa/` | Captain Marvel | requirements.md, evidence |

Write only in your own folders. Read anything. The `review` access mode also blocks Edit and Write tools:
a reviewer writes its verdict as the reply and, if allowed, into its own folder.

## Versions

- Every round writes a NEW folder (`v1`, `v2`, ...). Never overwrite an earlier version; the Review Booth
  shows them side by side and the critic checks for regressions.
- The round and version numbers are in your prompt. Use exactly those paths.
- Required files listed in your prompt must exist and be non-empty when you finish, or the stage fails.

## Fixes

- Each fix has an id (F1, S2, Y1 for the client's own notes). Answer EVERY id in your reply:
  `{"id":"F1","status":"done|partly|not done","what":"file and change, with numbers"}`.
- "done" means you looked at the result (a frame, a measurement) after the change. Say what you looked at.
- Do only what the fixes ask, plus anything the fix obviously breaks. No unrequested redesigns.

## The reply

End your final message with exactly ONE JSON object in a ```json fence, in the shape your prompt gives.
Paths are relative to the task folder with forward slashes. Numbers are numbers, not strings.
Nothing after the JSON.

## Windows rules

- The shell is Git Bash: quote every path ("C:/Users/..."), use forward slashes.
- In ffmpeg filter strings, escape the drive colon: `fontfile='C\:/Windows/Fonts/consola.ttf'`.
  Better: run ffmpeg with `cwd` set to the output folder and use relative names.
- Null output is `-f null -` (not /dev/null).
- Python: `python` (3.12+). Scripts in skills are standard-library only. Call them by full path from the
  skill's base directory (Claude Code prints it when the skill loads: "Base directory for this skill: ...").
- Long renders: run in the foreground with a generous timeout; never leave a background process running
  when you finish.

## Before you finish

- [ ] Every required file exists and opens.
- [ ] You opened (Read) every image you made and used it.
- [ ] Every fix id answered with evidence.
- [ ] One JSON reply at the very end.
