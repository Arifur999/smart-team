---
title: Loudness Targets
section: 03_AUDIO_ENGINEERING/loudness-and-export
type: reference
confidence: verify-first
sources: [herk-edit-kit, own-synthesis]
updated: 2026-10-26
---

# Loudness targets

Loudness is measured in LUFS (loudness units relative to full scale), integrated over the whole programme. Peaks are measured as true peak in dBTP.

> Platform behaviour changes. Treat every number as `verify-first`. Check the platform's current guidance before each delivery.

## Common targets

| Destination | Integrated loudness | True peak | Notes |
|---|---|---|---|
| Social / web short-form (reels, Shorts, TikTok) | About −14 LUFS (many creators work between −14 and −16) | At or below about −1 to −1.5 dBTP | One creator's house setting: near −14 LUFS, true peak at or below −1.5 dBTP |
| YouTube long-form | About −14 LUFS | At or below about −1 dBTP | The platform turns louder content down and generally does not boost quieter content |
| Podcast (spoken) | About −16 LUFS stereo (−19 mono) | At or below about −1 dBTP | Common convention for podcast apps |
| Streaming music-style | About −14 LUFS | At or below about −1 dBTP | Varies by service |
| Broadcast, Europe | −23 LUFS | At or below −1 dBTP | EBU R128 |
| Broadcast, US | −24 LKFS | At or below −2 dBTP | ATSC A/85 |
| Cinema / long-form dramatic | Mix-dependent | | Follow the distributor's spec |

## Rules that matter more than the number

1. **Measure the final encoded file**, not the WAV master. Lossy encoding shifts peaks.
2. **Measure in stereo.** A mono file reads about 3 dB lower. One short shipped too loud because it was measured in mono.
3. **True peak, not sample peak.** Leave headroom for the encoder (about −1.5 dBTP is a safe choice for lossy delivery).
4. **Do not slam the limiter** to hit the number. If loudness needs more than a few dB of limiting, the dynamics were wrong earlier. Rebalance first.
5. **Loudness range (LRA):** short-form usually has a small LRA. Do not squash it to zero.
6. **Consistency beats a perfect number.** Voice lines should sit at the same level across the piece.

## Measuring with ffmpeg

```bash
ffmpeg -i final.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -n 20
```

Look for **Integrated loudness (I)**, **Loudness range (LRA)**, and **True peak**. Or use `loudnorm` with `print_format=json` (see `04_SOFTWARE_MANUALS/ffmpeg/ffmpeg-cookbook.md`).

## Fixing a file that is off

- Too quiet: raise gain; if peaks hit the limit, use a limiter gently or reduce dynamics at source.
- Too loud: reduce gain. Do not rely on the platform to turn it down for you.
- Peaks too hot: lower the limiter ceiling and re-encode, then measure again.
