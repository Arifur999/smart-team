---
title: Mix Hierarchy and Levels
section: 03_AUDIO_ENGINEERING/mixing-and-mastering
type: rule
confidence: creator-tested
sources: [herk-edit-kit, own-synthesis]
updated: 2026-10-26
---

# Mix hierarchy and levels

## Hierarchy

1. **Voice** is the main signal. Everything else serves it.
2. **Music bed** supports mood.
3. **Sound effects** punctuate actions.
4. **Ambience / room tone** glues cuts.

## Working levels (starting points)

| Layer | Starting level | Notes |
|---|---|---|
| Voice | Peaks around −6 to −3 dBFS before mastering; loudness consistent between lines | Keep dialogue level steady across the whole piece |
| Music bed | About 9–14 dB under voice | About 11 dB is a good start |
| Sound effects | About 15–20 dB under voice peak, depending on type | Soft sounds quieter than clicks |
| Motion film, no voice | Warm pad around −16 dB relative; effects at roughly one-fifth of full level | In code-based compositions, set the volume attribute on every audio element explicitly |

These are starting points. Always set by ear, then verify loudness numerically.

## In code-based compositions

- Set volume **explicitly** on every audio element (voice 1.0, pad about 0.15, effects about 0.2 in one reference setup).
- Place audio elements as siblings in the root composition, not inside video elements.

## Ducking

- Duck music about 6–10 dB under speech, with a fast attack (10–50 ms) and a slower release (200–600 ms) so it breathes.
- Side-chain from the voice track in a DAW, or write volume automation by hand in code.
- Do not duck effects under voice unless they cover words.

## EQ for space

- Music: carve a gentle dip around 1–4 kHz so the voice sits on top.
- Voice: high-pass about 80 Hz.
- Effects: high-pass anything that does not need low end.
- Avoid stacking low-frequency content from music, effects, and voice in the same band.

## Stereo and mono

- Voice: centre.
- Music and ambience: wide.
- Effects: place where the action is, or centre for UI sounds.
- **Always check mono compatibility.** Many phones and social players fold to mono. A mix that disappears in mono has phase problems.

## Dynamics

- Voice: compress lightly for evenness.
- Mix bus: a gentle limiter at the end to catch peaks only.
- Do not over-compress. Quiet and loud contrast gives impact.

## Checks

- [ ] Voice clear on laptop speakers and phone
- [ ] Voice clear on headphones
- [ ] Mix survives mono
- [ ] No overs, no clipping
- [ ] Music does not fight consonants
- [ ] Silence moments are real silence (or room tone), not noise
