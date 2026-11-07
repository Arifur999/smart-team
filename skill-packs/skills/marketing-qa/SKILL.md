---
name: marketing-qa
description: Judge campaign deliverables (copy, social content, search and ads) against the brief and strategy - strategy fit, message clarity, voice, factual accuracy with sources, channel fit and limits, search quality, CTA and polish - on a weighted rubric with must-pass checks and exact rewrites routed to the stage that owns them. Use for the Marketing QA gate of the campaign line or any marketing review that must end in a verdict.
---

# Marketing QA

Read everything as the customer first, then as the brand's lawyer.

## Check

- Every piece against `02-strategy/STRATEGY.md`: right message, right CTA, right channel.
- Every fact, number, name and claim against `01-research/research.md` sources. A claim without a source is P0.
- Character limits (ads 30/90, meta 60/155) by counting, not eyeballing.
- Brand voice and banned words from the brand kit; humanizer patterns.
- Visuals: sizes per platform, text inside the safe area, real logo.

## Score (0-10, start at 5; weights from 02-strategy/rubric.json, else these)

| id | weight | 10 means |
|---|---|---|
| strategy | 20 | every piece serves the objective and a key message |
| message | 15 | one clear idea per piece, understood in 3 seconds |
| voice | 15 | sounds like the brand and like a person |
| accuracy | 15 | every fact sourced, nothing invented or exaggerated |
| channel | 10 | native to each platform, limits respected |
| search | 10 | keywords match intent, ads tight and compliant |
| cta | 10 | one clear next step everywhere |
| polish | 5 | no typos, consistent terms |

Must-pass: no unsourced claim; every briefed channel covered; no banned brand words.

## Fixes

At most 12, P0 first, each with the exact rewrite ("headline 2: 'Websites that work the night shift' (33
characters) → 'Sites that work all night' (25)"), `stage` strategy | copy | content | seo-ads, and `dimension`.
