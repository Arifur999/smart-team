---
title: ffmpeg Cookbook
section: 04_SOFTWARE_MANUALS/ffmpeg
type: recipe
confidence: verify-first
sources: [own-synthesis]
updated: 2026-10-26
---

# ffmpeg cookbook

Tested-pattern commands. Flags change between versions. Run `ffmpeg -version`, and record the version in your notes. Always keep the original file.

## Inspect

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of default=nw=1 in.mp4
```

## Web-ready H.264

```bash
ffmpeg -i in.mov -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart out.mp4
```

## Downscale with a sharp filter

```bash
ffmpeg -i in_4k.mp4 -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a copy out_1080.mp4
```

## 16:9 → 9:16 centre crop

```bash
ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -c:a copy out_vertical.mp4
```

## Trim

Accurate (re-encodes):

```bash
ffmpeg -i in.mp4 -ss 00:00:05 -to 00:00:12 -c:v libx264 -crf 18 -c:a aac out.mp4
```

Fast (no re-encode; cuts snap to keyframes):

```bash
ffmpeg -ss 5 -to 12 -i in.mp4 -c copy out.mp4
```

## Join clips (same codec, size, frame rate)

`list.txt`:

```
file 'a.mp4'
file 'b.mp4'
```

```bash
ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4
```

## Make frame rate constant

```bash
ffmpeg -i in.mp4 -vf fps=30 -c:v libx264 -crf 18 -c:a copy out_cfr.mp4
```

## Audio

```bash
# extract 48 kHz WAV
ffmpeg -i in.mp4 -vn -c:a pcm_s16le -ar 48000 out.wav

# replace audio, keep the video stream untouched
ffmpeg -i video.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out.mp4

# change volume
ffmpeg -i in.wav -af "volume=-3dB" out.wav
```

## Loudness (two-pass, accurate)

Pass 1: measure.

```bash
ffmpeg -i in.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null -
```

Pass 2: apply with the measured values from pass 1.

```bash
ffmpeg -i in.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=<..>:measured_TP=<..>:measured_LRA=<..>:measured_thresh=<..>:offset=<..>:linear=true" -ar 48000 out.wav
```

Then re-measure the **final encoded file**.

## Find silences (for tightening speech)

```bash
ffmpeg -i in.wav -af "silencedetect=noise=-35dB:d=0.3" -f null - 2>&1 | grep silence_
```

Use as a guide only. Judge by ear and by transcript; never cut inside a phrase.

## Detect shot changes

```bash
ffmpeg -i in.mp4 -vf "select='gt(scene,0.4)',showinfo" -f null - 2>&1 | grep pts_time
```

Raise or lower `0.4` to tune sensitivity.

## Frames and contact sheets

```bash
# one frame at 3.2 s
ffmpeg -ss 3.2 -i in.mp4 -frames:v 1 frame.png

# two frames per second
ffmpeg -i in.mp4 -vf fps=2 frames/f_%04d.png

# contact sheet (5 × 4)
ffmpeg -i in.mp4 -vf "fps=1,scale=320:-1,tile=5x4" -frames:v 1 sheet.png
```

## Image sequence → video

```bash
ffmpeg -framerate 30 -i frame_%04d.png -c:v libx264 -pix_fmt yuv420p out.mp4
```

## Burn SRT subtitles

```bash
ffmpeg -i in.mp4 -vf "subtitles=captions.srt:force_style='FontName=Montserrat,FontSize=24,Outline=2'" -c:a copy out.mp4
```

For word-by-word styled captions, render them in your composition tool instead.

On Windows the `subtitles` filter needs the drive colon escaped: `subtitles='C\:/proj/captions.srt'`. Simplest: run from the folder that holds the SRT and pass a bare file name. For Bangla subtitles, set `FontName` to an installed Bengali font or the text falls back to boxes.

## Overlay with timing

```bash
ffmpeg -i base.mp4 -i logo.png -filter_complex "[0:v][1:v]overlay=W-w-40:40:enable='between(t,2,5)'" -c:a copy out.mp4
```

## Fades

```bash
ffmpeg -i in.mp4 -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=9.5:d=0.5" -af "afade=t=in:st=0:d=0.3,afade=t=out:st=9.7:d=0.3" out.mp4
```

Do not fade the last spoken word.

## Habits

- Put `-ss` before `-i` for fast seeking; after `-i` for frame-accurate. Understand which you chose.
- Never edit in place. Write to a new file.
- Use `-y` only in scripts. Interactive runs should ask before overwriting.
- Quote paths with spaces.
- Save the exact command you used next to the output (a `.txt` file). It is your audit trail.
