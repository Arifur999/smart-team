---
title: Ducking, EQ and Limiting Recipes
section: 03_AUDIO_ENGINEERING/mixing-and-mastering
type: recipe
confidence: verify-first
sources: [own-synthesis]
updated: 2026-10-26
---

# Ducking, EQ and limiting recipes

Settings are starting points. Names and units vary by tool. Verify in your tool.

## Recipe 1: Voice-over-music duck in ffmpeg

Side-chain compression: music is reduced when voice is present.

```bash
ffmpeg -i voice.wav -i music.wav -filter_complex \
"[1:a][0:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[ducked]; \
 [0:a][ducked]amix=inputs=2:duration=first:normalize=0[out]" \
-map "[out]" mix.wav
```

Listen and adjust `threshold`, `ratio`, and `release`. `normalize=0` needs a recent ffmpeg; on older builds, set volumes before `amix` instead.

## Recipe 2: Simple EQ cleanup on voice

```bash
ffmpeg -i voice.wav -af "highpass=f=80,equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3500:t=q:w=1:g=2" voice_eq.wav
```

High-pass at 80 Hz, a small dip near 300 Hz, a small lift near 3.5 kHz. Always A/B.

## Recipe 3: Limiter on the final mix

```bash
ffmpeg -i mix.wav -af "alimiter=limit=0.84:attack=5:release=50" mix_limited.wav
```

The `limit` value is linear. 0.84 is about −1.5 dBFS. `alimiter` catches sample peaks, not true peaks, so encoded files can still overshoot. Run loudness normalisation after (see `loudness-and-export/loudness-targets.md`), then check true peak on the encoded file.

## Recipe 4: Rough de-esser idea

If your tool has no de-esser, a narrow dip at the harsh frequency plus a gentle high-shelf cut can help.

```bash
ffmpeg -i voice.wav -af "equalizer=f=6500:t=q:w=2:g=-3" voice_deessed.wav
```

A proper de-esser works only when the "s" appears, and sounds better. Use a DAW plug-in when possible.

## Manual ducking by automation (code-based video)

Write a volume envelope: baseline level, drop by 6–10 dB over 100–300 ms before a spoken line starts, return over 300–600 ms after it ends. Anchor the envelope to word timestamps, not hard-coded times.

## Notes

- Do loudness normalisation last, measure after.
- After any filter chain, listen for artefacts: pumping, lisping, dull voice.
- Keep dry and processed versions so you can undo.
