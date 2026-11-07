---
title: Kinetic Type Rules
section: 01_MOTION_DESIGN/typography-animation
type: rule
confidence: creator-tested
sources: [herk-edit-kit, own-synthesis]
updated: 2026-10-26
---

# Kinetic type rules

## Reveal patterns

| Pattern | Use for | Notes |
|---|---|---|
| **Word by word** | Statements, headlines, narration-led films | Default choice. Stagger 0.3–0.4 s; slower (0.5–0.6 s) for drama |
| **Character by character** | Terminal / typing feel, code, one short word | Overused on long text. Keep under about 20 characters |
| **Line by line** | Lists, credits, feature rows | Align to the spoken beat |
| **Mask / clip reveal** | Premium, clean | Text slides up from behind a clip edge |
| **Blur-in** | Soft, cinematic | Blur 20 px → 0 over 0.4–0.6 s |
| **Scale-through** | Big impact, transition to next scene | Scale the word up 6–8× while fading to pass the camera through it |
| **Carrier + tail** | Fast, energetic lines | First word moves furthest, later words travel less and settle faster |

## Carrier and tail

In a line like "Global payments made simple", give the first word the biggest move (say a 360 px slide) and let each later word travel less (120, 60, 25, 12 px). The line then reads as one gesture rather than four separate pops. Use a strong ease-out on the first word and a softer one on the tail.

## Timing to speech

- Anchor each word's entrance to the **audio onset** of the spoken word, using word-level timestamps.
- On a punchline, lead with the visual by about 0.2 s. It feels inevitable instead of late.
- Never hard-code a time that "should" match a word. Tie it to the transcript or a beat grid so it follows when the script changes.

## Readability

- A viewer needs time to read. Rough heuristic: about 0.3 s per word plus 0.5–1 s of hold after the line is complete. Short-form can go faster, because the voice is reading along.
- Keep on-screen words to labels and one line per beat. If the viewer must read a paragraph to follow, the visuals are failing.
- Keep important text out of platform UI zones (see `02_VIDEO_EDITING/captions-and-titles/caption-style-rules.md`).
- Size: for 1080-wide vertical video, body captions around 60–64 px; labels not below about 40 px; hero words as large as the frame allows.
- Contrast beats style. Check the pixels behind the text, not the design file.

## Scale as a storytelling tool

Type scale can jump a lot (labels at 48 px, hero words at 400 px or more). Animate with `scale`, not `font-size`, so edges stay smooth and layout does not reflow.

## Emphasis

Use one emphasis device per line: colour, weight, scale, or a glow. Stacking all four reads as shouting. Title Case for emphasis in a sentence-case design can work as a signal, but stay consistent.

## Multilingual caution

- Uppercase transforms change letters in some languages (Turkish dotted and dotless i is the classic case). Type display text in uppercase yourself and set the language on each word.
- Ship the font subsets that cover every glyph you need. Built-in fallbacks silently drop characters.
- For right-to-left scripts, reverse the stagger direction and test line breaks.

## Bangla (Bengali script)

- **Never split into characters.** Vowel signs (কি, কে) and conjuncts (ক্ষ, স্ত্র) are several code points that render as one shape. Splitting by character breaks them into dotted circles and loose marks. Animate by word; if you need smaller units, split by grapheme cluster (`Intl.Segmenter` with `granularity: "grapheme"`) and still check conjuncts.
- **Load a Bengali font explicitly** (Noto Sans Bengali, Hind Siliguri, Anek Bangla, Tiro Bangla for serif). Most Latin display fonts have no Bengali glyphs and the fallback will not match the design.
- Bengali has no capitals. Get emphasis from weight, colour or scale.
- Leave more line height than for Latin text: the matras and vowel signs above and below need room.
- Mixed Bangla and English on one line: set each font explicitly and check the two baselines match visually.
- Render a test still with the longest conjuncts in the script before building the animation.
