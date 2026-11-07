---
name: design-reference-match
description: Read design references (websites, screenshots, Figma exports, brand sites) completely and turn them into measured design grammar - grid, type scale, palette, spacing, radii, shadows, imagery, components - plus brand facts and conflicts, so a design team can match or beat them. Use for the Read references stage of the design line or before any "make it look like this" design.
---

# Reading design references

Guessing a reference's look produces "close but cheap". Measure it.

## Websites

1. Full-page screenshots at 1440 and 390 px wide with a headless browser (Playwright: `npx playwright screenshot
   --full-page --viewport-size=1440,900 <url> 01-reference/boards/<name>-1440.png`, and 390,844).
2. Read the real values from the CSS (computed styles of body, h1-h3, buttons, cards, sections):
   font families and weights, font sizes and line heights, colours (hex), spacing between sections, container
   width, grid columns, radii, shadows. `npx hyperframes capture <url>` also extracts tokens.
3. Note the components worth keeping (hero, cards, nav, footer) and what makes them work.

## Images and screenshots

Open each with the Read tool. Measure with pixels: the grid (columns, gutters), text sizes relative to the frame,
colours (read exact hex by cropping a flat area to 1x1 with ffmpeg), spacing rhythm.

## Write

- `01-reference/boards/*.png`: one board per reference, annotated if useful.
- `01-reference/design-spec.md`: every value a number, marked measured or estimated. Sections: grid and widths,
  type scale and families, palette, spacing scale, radii, shadows, imagery and illustration style, motion, the
  3-5 things that make it feel premium, and "never" (what would break it).
- `01-reference/brand-facts.md`: logo files, brand tokens and fonts (from the brand kit skill when loaded, else
  the client's site CSS), copy verbatim from the brief, and a brand-vs-reference conflicts table with your
  default decision for each.
