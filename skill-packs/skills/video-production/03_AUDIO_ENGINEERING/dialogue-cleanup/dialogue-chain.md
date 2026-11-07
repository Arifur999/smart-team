---
title: Dialogue Cleanup Chain
section: 03_AUDIO_ENGINEERING/dialogue-cleanup
type: recipe
confidence: established
sources: [own-synthesis]
updated: 2026-10-26
---

# Dialogue cleanup chain

Use the lightest touch that works. Heavy processing makes voices sound underwater.

## Order of processing

1. **Check the raw.** Listen on headphones. Note noise type (steady hiss, hum, room echo, intermittent noise), clipping, and plosives.
2. **Fix clipping first.** Clipped audio cannot be fully repaired. Reduce gain on re-record if possible.
3. **Remove hum.** If you hear a steady tone at mains frequency (50 Hz or 60 Hz, depending on region), use a narrow notch filter or a dedicated hum-removal tool.
4. **High-pass filter.** Cut below about 70–100 Hz for speech to remove rumble. Do not go so high that the voice thins.
5. **Noise reduction.** Learn the noise from a few seconds of room tone, then reduce gently. Stop before the voice sounds watery or lispy.
6. **De-click and de-plosive.** Soften mouth clicks and breath pops.
7. **EQ for clarity.**
   - Remove boxiness: gentle cut around 200–400 Hz if muddy.
   - Presence: gentle lift around 2–5 kHz if dull.
   - Air: small shelf above about 10 kHz only if the recording supports it.
8. **De-ess.** Tame harsh "s" sounds around 5–8 kHz.
9. **Compress lightly.** About 2:1 to 4:1, slow-to-medium attack, 3–6 dB of gain reduction on peaks. The goal is evenness, not squashing.
10. **Level.** Set the voice to a consistent loudness (see `mixing-and-mastering/mix-hierarchy-and-levels.md`).
11. **Limit peaks** just enough to prevent overs.

All EQ and noise settings above are starting points. Voices and rooms differ. Use your ears.

## Room tone

Record 10–30 seconds of silence in the same room at the end of every session. Use it to fill gaps after cutting so the room sound does not vanish between phrases (dead silence sounds like a bug).

## Judge by A/B

Bypass the chain every few steps. Each step must improve things. If you cannot tell the difference, remove it.

## AI-based speech enhancement

Tools that rebuild speech (often called speech enhancers) can rescue bad recordings but can also change the voice, add artefacts, or invent syllables. Always compare against the original. Do not use on a voice where authenticity matters (testimonials) unless the person has approved the result.

## Sync-safe

Apply processing to the whole dialogue track, not per clip, wherever possible. Per-clip differences change the sound at every cut.
