git remote set-url origin https://github.com/Arifur999/video-skill.git
git remote -v
git push -u origin main---
title: Colour Grading Workflow
section: 02_VIDEO_EDITING/color-grading
type: recipe
confidence: established
sources: [own-synthesis]
updated: 2026-10-26
---

# Colour grading workflow

Correct first, then grade. Correction makes footage accurate. Grading makes it feel like something.

## Order of operations

1. **Know the source.** Log or flat profile? Rec.709? HDR? Wrong assumptions here break everything after.
2. **Set up the working space.** Match the project colour settings to the delivery target. For web and social, that is almost always Rec.709 / sRGB-like SDR.
3. **Normalise exposure.** Set black point and white point using the waveform. Do not crush blacks or clip highlights unless the look needs it.
4. **White balance.** Neutral greys should read neutral on the vectorscope or RGB parade.
5. **Skin tone check.** Skin should sit near the skin-tone line on the vectorscope. Fix this before stylising.
6. **Contrast shape.** Use curves: gentle S-curve for punch, lifted blacks for a soft look.
7. **Saturation.** Adjust overall, then selectively. Pull back saturated colours that distract.
8. **Match shots.** Make every shot in a scene sit at the same brightness and colour before the creative look.
9. **Creative look.** Add a look (tint, split toning, a LUT at partial strength) on top, usually as the last step.
10. **Check on other screens.** Phone, laptop, TV if relevant.

## Scopes beat eyes

Your eyes adapt and your screen may be uncalibrated. Read the waveform (brightness), vectorscope (colour), and RGB parade (balance between channels).

## Primary vs secondary

- **Primary:** affects the whole image (lift, gamma, gain, white balance).
- **Secondary:** targets one area or colour (qualifier, power window, mask) such as skin, sky, or a brand colour.

## LUT cautions

- A LUT is made for a specific input (a certain camera log profile). On the wrong footage it looks wrong.
- Apply a creative LUT at reduced strength, not 100%, unless you tested it.
- Grade before a creative LUT, so you do not fight it.
- Keep correction and look on separate nodes or layers so each can be tuned alone.

## Consistency across a project

- Same look across all clips, same colour space settings, and a reference frame per scene.
- Brand colours: check them on the final output, not just in the design file. Compression and display change colour.

## Common mistakes

- Crushed blacks that hide detail in dark scenes.
- Over-saturated skin.
- Different tint on every clip.
- Teal-and-orange by default. It reads as a template.
- Grading on a bright, uncalibrated screen.
- Forgetting that hard-to-see detail (text on dark backgrounds) must stay readable after grading.
