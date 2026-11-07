---
title: Delivery and Export Specs
section: 03_AUDIO_ENGINEERING/loudness-and-export
type: reference
confidence: verify-first
sources: [herk-edit-kit, saas-motion-kit, own-synthesis]
updated: 2026-10-26
---

# Delivery and export specs

> **Verify before use.** Platform limits and recommended settings change. Check the current official specs for each platform and record the version you used.

## Resolution and shape

| Format | Typical frame | Aspect |
|---|---|---|
| Vertical short-form (Reels, Shorts, TikTok) | 1080 × 1920 | 9:16 |
| Landscape (YouTube, web) | 1920 × 1080 or 3840 × 2160 | 16:9 |
| Square (feed) | 1080 × 1080 | 1:1 |
| Portrait feed | 1080 × 1350 | 4:5 |

## Safe zones

App UI (username, caption text, buttons, progress bar) covers parts of the frame and changes with each app update. A conservative working box for 1080 × 1920 that clears Reels, TikTok and Shorts in their current layouts (verify on the platform before a paid campaign):

- Keep key text, captions and faces out of the **top 250 px** and the **bottom 420 px**.
- Keep them out of the **right 150 px** (like, comment and share buttons).
- Inside that, the general rule still holds: content within 90% action-safe, text within 80% title-safe.

Landscape (16:9): keep text inside the 80% title-safe box; YouTube end-screen elements cover the last 5-20 s in the centre and right.

## Frame rate

- Match the source. Mixed frame rates cause judder.
- Common: 24 (film look), 25 (PAL regions), 30 (social, screen), 60 (smooth UI motion, gaming, fast graphics).
- Do not convert 24 to 30 by dropping frames in a hurry. Use a proper conversion.

## Codec starting points

| Use | Video | Audio |
|---|---|---|
| Web and social delivery | H.264 (AVC), yuv420p, CRF about 18–20, `faststart` | AAC, about 192–256 kbps, 48 kHz |
| Higher efficiency | H.265 (HEVC) where supported | AAC |
| Master / archive | ProRes or a high-bitrate intermediate | PCM / WAV, 48 kHz |

48 kHz audio is standard for video.

## Render-big, deliver-small

Render at 4K, then downscale to 1080p or 2K with a high-quality filter (Lanczos). Edges, text, and 3D come out cleaner than rendering natively at the smaller size. Deliver the smaller version unless the platform wants 4K.

## Colour

- SDR Rec.709 for most social and web.
- Tag the file's colour properties so players interpret them correctly.
- Check HDR sources: tone-map to SDR for social unless the platform supports HDR delivery.

## File naming

```
client_project_platform_aspect_length_version_date.mp4
example: dentique_clinic-promo_reels_9x16_30s_v03_2026-10-26.mp4
```

## Loop delivery (looping films)

For seamless loops, use whole-number cycles for all ambient motion and run a seam check on the first and last frame. Deliver without audio, or with audio designed to loop.

## Pre-delivery steps

1. Run the QC checklist (`02_VIDEO_EDITING/editing-techniques/qc-checklist.md`).
2. Measure loudness on the delivered file.
3. Play the file on a phone.
4. Save the project and source with the version number.
5. Note anything the client must know (music licence, font licence, usage limits).
