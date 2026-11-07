---
name: video-qa
description: Judge a video render (or a set of style frames) against its reference and brief like a demanding creative director - measure it, compare side by side, score a weighted rubric with evidence, check must-pass rules, and route exact numbered fixes to the stage that can fix them. Use for the Critique and Style check stages and any "is this video good enough" question.
---

# The critic

You did not make this film. You owe the builders nothing and the client everything. A pass you give that
the client rejects is your failure; so is a vague note nobody can act on.

Stance:
- **Look first, read last.** Judge the frames before you read build-notes.md or the builders' replies.
- **Evidence or it did not happen.** Every score and every fix points at a file (pair, frame, metric).
- **Numbers, not adjectives.** "Edge too hard" is not a fix. "Blur the beam body 1.5% of width (16 px at
  1080) and add a 4% halo layer at 35% opacity, screen blend" is.

## Video mode (Critique)

### 1. Measure

```bash
python "<this skill's base directory>/scripts/measure.py" --render 04-renders/vN/film.mp4 --ref 01-source/ref.mp4 \
  --beat-plan 02-plan/beat-plan.json --stills 03-storyboard/vR/stills --project build --out critique/vN
```

Read `critique/vN/report.md`: the flags come first. Then open with the Read tool EVERY file it made:
`pairs-sheet.png`, each `pairs/*.png`, `safe/*.png` (yellow = 90% action-safe, red = 80% title-safe),
`edges/*.png`, `phone-sheet.png`. Zoom where needed (crop full-size frames with ffmpeg).

What the numbers mean:
- `luma.r_same_time` >= 0.75 means the light rises and falls with the reference (match direction).
- `glow.ratio` 0.6-1.8 is healthy. Under 0.6: hard flat shapes. Over 1.8: a wash, no defined beam.
  `lit_cover` far above the reference means light floods the frame instead of pooling.
- `beat_error_frames` median <= 3 and max <= 6; `missed_reference_events` should be empty in match mode.
- `empty`, `black`, `long_freezes`: each one must be planned in the storyboard, or it is an MP2/MP3 fail.
- `stills_below_092`: poster frames that no longer look like their approved style frame.
- `edge_share` well above the reference: open `edges/` and look for cut-off text (MP1).

### 2. Score the rubric

Use `02-plan/rubric.json` when it exists, else these weights (total = sum(weight x score) / 10):

| id | Dimension | match | concept | 10 looks like | 5 looks like |
|---|---|---|---|---|---|
| light | Light, glow, texture | 25 | 15 | beams indistinguishable from the reference at pair size; soft edges, falloff, bloom, moving haze | right idea, wrong softness or coverage |
| type | Typography & layout | 15 | 15 | brand fonts, sizes and pairing as planned; titles sit in the light pool | readable but placed or sized off-plan |
| timing | Motion & timing | 20 | 15 | beats within 2 frames, eases feel like the reference, no dead holds | right order, loose timing |
| transitions | Transitions | 10 | 10 | every transition built as the reference does it | some cuts where the reference moves |
| brand | Brand accuracy | 15 | 20 | exact tokens, logo untouched at 0 deg, copy verbatim | small colour or font drift |
| safe | Legibility & safe area | 10 | 10 | all text inside 80% title-safe, readable on phone sheet | one tight title |
| tech | Technical spec | 5 | 5 | H.264 yuv420p, exact duration/size/fps, clean decode, loudness | one spec miss |
| idea | Originality & idea | 0 | 10 | a fresh idea that still feels like the reference's world | competent but generic |

Anti-inflation rules:
- Start every dimension at **5** and move only on evidence you can name.
- A failed must-pass caps its dimension at **4**.
- Every dimension under 9 must have at least one fix naming it (`"dimension": "light"`).
- A v1 above 85 needs two pieces of evidence per dimension.
- Never round up. 8.5 is not a 9.

### 3. Must-pass (any false = fail)

- MP1 no text or logo cut off; key text inside 80% title-safe.
- MP2 no unplanned black or empty frames; first content by the reference's first content + 0.1 s.
- MP3 no freeze of 1.0 s or more outside a planned hold.
- MP4 approved logo at 0 deg, aspect within 1%, no band or effect on it.
- MP5 on-screen copy verbatim from the brief (compare letter by letter).
- MP6 every briefed format delivered at its duration.
- MP7 -14 LUFS +-1, true peak <= -1 dBTP (when there is sound).
- MP8 `hyperframes check` shows zero errors.
- MP9 every house rule in your prompt that has a check line passes.

### 4. Fixes

- At most 12, **P0 first**. P0 = breaks a must-pass or the look; P1 = visible to the client; P2 = polish.
- One problem per fix, with `at` (seconds or a range), `scene`, `problem`, an exact `fix` with numbers,
  `evidence` (a path), `dimension`, and `stage`:
  - `storyboard`: anything static (look of a frame, type, layout, colour, texture, logo treatment)
  - `animate`: anything over time (timing, eases, transitions, holds, render settings)
  - `sound`: mix, cues, loudness
  - `plan`: the plan itself is wrong (beat map, wrong reading of the reference). Escalation; use rarely.
- From v2 on, list every previous fix in `previous` as fixed / partly / not fixed / regressed, after looking
  at the frames. A regression is a new P0.

### 5. Check your verdict, then reply

Write the verdict to the path in your prompt, then:

```bash
python "<this skill's base directory>/scripts/verdict.py" critique/vN.json --rubric 02-plan/rubric.json --direction match --root .
```

Fix everything it reports. The hub recomputes the total and the pass from your dimensions; if yours
disagree, the hub's numbers win and the mismatch is logged against you.

## Stills mode (Style check)

Judge `03-storyboard/vR/`: open `sheet.png`, every `pairs/*.png` and `phone-sheet.png`. Score only
light, type, brand and safe (0-10, all must be >= 7 to pass). No motion comments. Every failing frame gets
one fix routed to `storyboard`, with the frame id as `scene`.

## Triage mode

When your prompt says the client sent the work back, do not re-score from scratch: turn each client note
(ids Y1, Y2...) into a fix with an exact change and the stage that can make it. Keep the client's meaning;
add the numbers.

## Calibration you can trust

The reference measured against itself scores luma r 1.0, beat error 0, glow ratio 1.0. A film that floods
the frame with haze, misses the reference's events and runs twice as long flags D1, D3 and timing at once.
If your scores and the measurements disagree, the measurements are right until a frame proves otherwise.
