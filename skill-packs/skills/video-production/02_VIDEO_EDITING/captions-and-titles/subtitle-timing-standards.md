---
title: Subtitle Timing Standards (Long-Form and Broadcast)
section: 02_VIDEO_EDITING/captions-and-titles
type: reference
confidence: verify-first
sources: [own-synthesis]
updated: 2026-10-26
---

# Subtitle timing standards

For subtitles and closed captions (SRT, VTT), not the fast word-by-word style used in reels. The figures below are widely used industry guidelines from major streaming style guides. They differ by platform and language, so **check the delivery spec before you deliver**.

## Common guidelines

| Item | Typical guideline |
|---|---|
| Characters per line | About 42 |
| Lines per subtitle | Maximum 2 |
| Reading speed (adult content) | About 17–20 characters per second |
| Reading speed (children's content) | Lower, about 13–17 characters per second |
| Minimum duration | About 5/6 of a second (roughly 20 frames at 24 fps) |
| Maximum duration | About 7 seconds |
| Gap between subtitles | A couple of frames at least |

## Line breaking

- Break at logical points: after punctuation, before conjunctions or prepositions.
- Do not separate an article from its noun, a name from its title, or a verb from its auxiliary.
- Prefer a shorter first line (pyramid shape) when the break is not natural.

## Timing to picture

- In-time on the first spoken word (or a few frames before), out-time after the last word fades, plus a little hold.
- Do not cross shot cuts if you can avoid it. Splitting at a cut keeps the eye calm.
- Never show a caption before the speaker has said something that would give it away (spoiler timing).

## Content conventions

- Identify speakers when off-screen or unclear.
- Write significant sounds in brackets: [phone rings], [applause].
- Use italics for off-screen voice and foreign words where the format supports it.
- Numbers: spell out one to nine, digits for 10 and above (a common convention), except in technical contexts.

## Formats

- **SRT:** simple; index, timecode, text. Broad support.
- **VTT:** web standard; supports positioning and basic styling.
- **ASS / SSA:** richer styling for burn-in with some tools.
- Keep source captions in UTF-8.

## Always verify

Platform specs change. Before delivering to a streaming service, broadcaster, or client with a style guide, read their current timed-text spec. Record the spec you followed in the project notes.
