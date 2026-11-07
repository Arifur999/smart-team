---
title: ffmpeg QC and Sync Verification Recipes
section: 04_SOFTWARE_MANUALS/ffmpeg
type: recipe
confidence: verify-first
sources: [herk-edit-kit, saas-motion-kit, own-synthesis]
updated: 2026-10-26
---

# ffmpeg QC and sync verification

How to prove an edit is clean without trusting your eyes alone.

## 1. Cut with exact frames, in one pass

Encoding each segment separately and joining them can drift lip sync by about a frame at some joins. Select exact frame numbers in a single filter pass.

```bash
ffmpeg -i in.mp4 \
  -vf "select='between(n,0,120)+between(n,180,300)',setpts=N/FRAME_RATE/TB" \
  -af "aselect='between(t,0,4)+between(t,6,10)',asetpts=N/SR/TB" \
  out.mp4
```

Adapt ranges to your cut list (frames for video, seconds for audio). Keep the cut list in a text file so the same list drives both.

## 2. Compare cut frames to the raw

For each cut, extract the frame after the cut from the final render and the corresponding source frame from the raw. Compare them (SSIM or by eye).

```bash
ffmpeg -i final.mp4 -ss 12.40 -frames:v 1 final_12_40.png
ffmpeg -i raw.mp4   -ss 33.10 -frames:v 1 raw_33_10.png
ffmpeg -i final_12_40.png -i raw_33_10.png -lavfi ssim -f null -
```

A matching frame **count** alone does not prove the right frames were picked.

## 3. Frame strips around cuts

A strip of about 20 frames centred on each cut catches one-frame empty panels, captions flashing over the wrong shot, and flash frames that a single screenshot misses.

```bash
ffmpeg -ss 11.9 -i final.mp4 -vf "select='between(n,0,19)',scale=160:-1,tile=10x2" -frames:v 1 strip.png
```

## 4. First two and a half seconds

```bash
ffmpeg -i final.mp4 -t 2.5 -vf "fps=30,scale=270:-1,tile=10x8" -frames:v 1 first_2_5s.png
```

Look for anything covering the mouth, a bad first frame, or a flash.

## 5. Words whole at every cut

1. Transcribe the final render with word-level timestamps.
2. Compare the words around every cut with the raw transcript.
3. Then **listen** at every cut. A transcript alone is not proof, because speech-to-text may "heal" a clipped word.

## 6. Contrast behind captions

Extract a frame, crop the caption area, and measure the average luminance behind it (a small script, or sample by eye). Never assume.

## 7. Loudness on the delivered file

```bash
ffmpeg -i final.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -n 20
```

Measure in stereo. A mono file reads about 3 dB lower.

## 8. Loop seam check

Extract the first and last frames of a loop and compare them. They should match closely. Also check that every ambient motion uses whole-number cycles per loop.

```bash
ffmpeg -i loop.mp4 -vf "select=eq(n\,0)" -frames:v 1 first.png
ffmpeg -sseof -0.05 -i loop.mp4 -frames:v 1 last.png
```

## 9. Duration and stream check

```bash
ffprobe -v error -show_entries format=duration:stream=index,codec_type,codec_name,r_frame_rate -of default=nw=1 final.mp4
```

Check that audio and video durations match, frame rate is constant, and codecs are as specified.

## When a tool disagrees with your ears

Trust your ears and your eyes on real playback, then find out why the tool disagreed. Do not ignore a complaint from a tool until you have checked the real frame.
