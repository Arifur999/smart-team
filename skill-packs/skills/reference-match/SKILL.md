---
name: reference-match
description: Read a reference video from start to finish (A to Z) and turn it into measured grammar - beats, light, type, layout, motion, transitions, sound, brand conflicts - that a team can build to and a critic can judge against. Use for the Read source stage, and whenever a plan or a critique must compare work with a reference.
---

# Reading a reference A to Z

The reference is the contract. Last time nobody measured it: the team guessed, the hyperframes defaults
(no black backgrounds, no glow, no centred text) overrode its look, and the film missed. Your job is to
make sure that never happens: every second seen, every look turned into a number.

## 1. Measure (2 minutes)

```bash
python "<this skill's base directory>/scripts/analyze_reference.py" "<original reference>" --out 01-source
```

It copies the file (never touch the original), then writes `probe.json`, `luma.tsv` (10 Hz), `events.json`
(motion events, hard cuts, black and frozen spans), `audio.json`, `reference-sheet.png` (a frame every 0.2 s
with timecode), `strips/` (0.8 s around each event), `reference-frames/` (full-size frames), `beats.draft.json`
and `summary.md`. Read `summary.md` first.

Notes on the numbers:
- "empty" = under 0.1% of pixels lit. blackdetect also calls small lights on black "black"; read both.
- `mid_tone_share` = share of lit pixels that are mid-tones (40-200). Soft light with falloff is high;
  flat full-white shapes are low. Use it with the frames, not instead of them.
- Events are merged within 0.15 s. Two events 0.2 s apart (a dip and a re-light) are real.

## 2. Look at everything (the A-to-Z rule)

Open with the Read tool, in this order, and take notes per timecode:
1. Every `reference-sheet*.png` (the whole film at 5 fps).
2. Every `strips/*.png` (how each event moves: direction, speed, ease, what leads).
3. Every `reference-frames/*.png` (detail: edges, texture, type, logo).

For anything unclear (a transition, a texture), extract more frames:
`ffmpeg -v error -ss <t> -i 01-source/ref.mp4 -vf fps=25,scale=320:-2,tile=5x2 -frames:v 1 01-source/zoom_<t>.png`
and for crops at full size: `-vf "crop=iw/3:ih/3:iw/3:ih/3"`.

Nothing may be described from imagination. If you did not see it in a frame, you do not know it.

## 3. Name every beat → `01-source/beat-map.json`

Start from `beats.draft.json`, split or merge by what you saw, and fill every field:

```json
{"duration": 11.24, "size": "1280x720", "fps": 25,
 "beats": [{"id": "B02", "name": "Brand Design title in the first beam", "start": 3.08, "end": 5.0,
   "poster": 3.6, "what_moves": "beam swings 30deg left-to-right, title fades up inside the pool",
   "ease": "fast-out slow-in, settles in 0.3 s", "transition_in": "beam swing from the lamp (no cut)",
   "sound": "whoosh on the swing, soft hit at 3.12", "text": "Brand / Design",
   "light": "one lamp lower-left, cone ~35deg, soft edge ~2% of width, bright pool upper-right",
   "measured": ["start", "end", "luma"], "estimated": ["cone angle"]}]}
```

Coverage self-check before you go on: beats start at 0, end at the duration, no gaps, no overlaps.

## 4. Grammar → `01-source/style-spec.md`

Every adjective becomes a number. Mark each value *measured* (from a script or a pixel read) or
*estimated* (judged from frames). Sections:

- **Stage**: background colour (hex), vignette, depth.
- **Light**: sources (count, position), cone angle, edge softness (% of width over which the edge fades),
  falloff along the beam, bloom at the lamp, haze/grain, colour (hex of the pool; use `crop → scale=1:1`
  to read exact hex), how the light moves during holds.
- **Surface**: texture inside the light (bubbles, paper, noise), its scale and contrast.
- **Type**: families (identify or name the closest), weights, sizes as % of frame height, colours,
  tracking, line pairing (e.g. bold sans line + serif italic line), alignment relative to the light pool.
- **Layout**: where titles sit (thirds, pool centre), safe margins used.
- **Motion**: average beat length, entrance and exit styles, eases (in words and as cubic-bezier),
  hold length, what keeps moving during holds.
- **Transitions**: each kind, its length in frames, what drives it (light swing, blackout, white flood).
- **Sound**: loudness, bed character, where hits land (from `audio.json` momentary peaks).
- **Premium cues**: the 3-5 things that make it feel expensive.
- **Allowed by reference**: everything the reference does that a skill default bans (black background,
  glow, centred text, serif italics, ...). The plan copies this line; it overrides the BANNED list.
- **Never**: what would break the look (hard-edged polygon beams, cuts through black that the reference
  does not have, text outside the light, ...).

## 5. Brand → `01-source/brand-facts.md`

- Logo files (paths) and how the reference treats a logo (in light, never transformed).
- Brand tokens and fonts: from the brand kit skill if one is loaded, or `npx hyperframes capture <site>`
  for a website. Never sample brand colours from a PNG logo when tokens exist.
- On-screen copy: verbatim from `00-brief/brief.md`. Do not fix spelling or casing.
- **Conflicts table**: every place brand and reference disagree (colour of the end card, font, logo on
  black vs white), with your default decision and why. At most 3 become questions for the client.

## 6. Different delivery aspect

If the brief's aspect differs from the reference, add a section "Recomposition": centre on the light pool,
scale by the short side, keep title-safe 80%, never crop the logo; say how each beat's layout moves.

## Reply

`{"stage":"source","summary":"...","beats":N,"duration":seconds,"conflicts":["..."]}`
