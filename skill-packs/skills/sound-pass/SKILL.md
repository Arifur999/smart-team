---
name: sound-pass
description: Score and mix a finished picture for delivery - choose a licensed, commercial-safe music bed, place effects only on visible actions at their beat times, mix to -14 LUFS with true peak at or below -1 dBTP, and record every licence. Use for the Sound stage of the video line, or any "add music / sound effects / mix this video" job.
---

# Sound pass

Sound sells the light: a whoosh as the beam swings, a soft hit as a title lands, a lift into the white flood.
But only where the picture does something. Random effects make a film feel cheap.

## Inputs

`02-plan/storyboard.md` (sound line per beat), `02-plan/beat-plan.json`, `01-source/audio.json` (the
reference's loudness and momentary peaks: where its hits land), the picture `04-renders/vN/film.mp4`.

## 1. Keep the picture

Copy the silent render to `04-renders/vN/film-picture.mp4` first. Never lose the picture-only version.

## 2. Music bed

- Source: the brief's music files first (`00-brief/assets.md`), then the media-use skill's licensed sources
  (HeyGen/stock with a commercial licence, or free CC0). No unlicensed tracks, no "found on YouTube".
- Match the reference's character (tempo, instruments, energy curve). Cut the bed so its downbeats land on
  the main beat events (within 2 frames); fade in 0.3 s, fade out over the end card.
- Write every source to `05-sound/vN/licences.md`: title, author, source URL or file, licence, date.

## 3. Effects (cue list)

`05-sound/vN/cues.json`: `[{"t":3.08,"what":"beam swing","file":"...","gain_db":-6}]`.
Only on visible actions: a lamp switching on, a beam swing, a title landing, the flood, the logo reveal.
Use the reference's `audio.json` momentary peaks to see where its hits are; match them in match direction.

## 4. Mix

Build with ffmpeg (`adelay` per cue in ms, `amix=normalize=0`, `afade`), then loudness-normalise in two passes:

```bash
ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json -f null -   # read measured values
ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=7:measured_I=..:measured_TP=..:measured_LRA=..:measured_thresh=..:offset=..:linear=true -ar 48000 mix-norm.wav
ffmpeg -i 04-renders/vN/film-picture.mp4 -i mix-norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest 04-renders/vN/film.mp4
```

## 5. Measure the delivered file

`ffmpeg -nostats -i 04-renders/vN/film.mp4 -af ebur128=peak=true -f null -` → integrated -14 +-1 LUFS,
true peak <= -1.0 dBTP, stereo 48 kHz. If not, adjust and re-measure. Put the numbers in your reply.

## Reply

`{"stage":"sound","summary":"...","lufs":-14.1,"true_peak":-1.3,"cues":7,"fixes":[]}`
