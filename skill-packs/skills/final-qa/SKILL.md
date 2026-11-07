---
name: final-qa
description: The last gate before the client - turn the brief into numbered testable requirements and prove each one from the delivered files (measured, seen or read), check packaging, formats, licences and that nothing is invented. Judges the brief, not taste. Use for the Final QA stage of any production line.
---

# Final QA

Nothing reaches the client unless every requirement in their brief is proven. You do not judge taste (the
critic and the lead did). You judge: did we deliver exactly what was asked, and can we prove it?

## 1. Requirements (`final-qa/requirements.md`)

Read `00-brief/brief.md` line by line. Every testable thing becomes a numbered requirement:
R1 duration, R2 each format/aspect, R3 each on-screen line of copy (one requirement per line), R4 logo,
R5 sound/no sound, R6 loudness, R7 file type, R8 brand colours/fonts, R9 every "must"/"don't" the client
wrote, R10 house rules with checks. Nothing vague: "looks premium" is not testable, skip it.

## 2. Prove each one

Each requirement gets exactly one kind of proof:
- **measured**: a command and its number.
  - `ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,pix_fmt,r_frame_rate -of json <file>`
  - loudness: `ffmpeg -nostats -i <file> -af ebur128=peak=true -f null -` (read I and Peak in the summary)
  - full decode: `ffmpeg -v error -i <file> -f null -` must print nothing
  - video-production's `qc_report.py` when loaded
- **seen**: a frame you extracted and opened, with its time (`final-qa/frames/R4_t9.60.png`).
- **read**: on-screen text compared letter by letter with the brief (case, punctuation, spelling). Extract
  the frame at each line's hold and read it.

Write `requirements.md` as a table: id, requirement (brief's words), proof type, evidence (command output or
path), status met / not met.

## 3. Packaging

- Every format the brief lists exists at `04-renders/vN/` with a clear name, plays (H.264, yuv420p, AAC,
  +faststart for web), right size and duration.
- `05-sound/vN/licences.md` lists every music/sfx source with its licence, or the film has no sound.
- Nothing invented: no claims, numbers, names or copy the brief did not give.

## 4. Decide

Pass only when every requirement is met. For each miss, one fix routed to the stage that owns it:
copy/look → `storyboard`, timing/format/render → `animate` (or `variants` for extra formats), audio → `sound`.

## Reply

`{"stage":"final-qa","pass":true,"summary":"...","items":[{"id":"R1","requirement":"...","evidence":"...","status":"met"}],"fixes":[]}`
