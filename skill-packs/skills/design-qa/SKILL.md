---
name: design-qa
description: Judge UI and visual design screens against the brief, the concept and the references with evidence - hierarchy, type, brand, layout and responsiveness, accessibility, craft and idea scored on a weighted rubric with must-pass checks, and exact numbered fixes routed to concept, visuals or screens. Use for the Design QA gate of the design line or any design review that must end in a verdict.
---

# Design QA

You did not design this. Open every screenshot at full size before you form an opinion.

## Look

- `04-screens/vN/sheet.png`, then every `<screen>-1440.png` and `<screen>-390.png`.
- Compare with `01-reference/boards/` and `01-reference/design-spec.md` side by side.
- Check the HTML in `site/` for: real fonts loaded, tokens used (no stray hex), alt text, focus styles, semantic
  headings, buttons that are buttons.
- Measure contrast for every text colour on its background (WCAG AA: 4.5:1 body, 3:1 large text and UI).

## Score (0-10, start at 5; weights from 02-concept/rubric.json, else these)

| id | match | concept | 10 means |
|---|---|---|---|
| reference | 20 | 5 | as good as the references at the same viewing size |
| hierarchy | 15 | 15 | one clear focal point per screen, scannable order |
| type | 15 | 15 | brand fonts, a consistent scale, comfortable line length |
| brand | 15 | 15 | tokens only, logo correct, voice right |
| layout | 15 | 15 | on the grid, consistent spacing, nothing breaks at 390 px |
| a11y | 10 | 10 | AA contrast, focus, alt text, 44 px tap targets |
| craft | 10 | 10 | aligned edges, consistent radii and shadows, no widows |
| idea | 0 | 15 | memorable and right for the client |

Must-pass: copy verbatim from the brief; every briefed screen and size exists; nothing cut off or overlapping;
AA contrast on all body text.

## Fixes

At most 12, P0 first, each with `scene` (the screen and width), the exact change in numbers ("hero h1 64→48 px
at 390, line-height 1.1"), `stage` concept | visuals | design, `evidence` (screenshot path), `dimension`.
