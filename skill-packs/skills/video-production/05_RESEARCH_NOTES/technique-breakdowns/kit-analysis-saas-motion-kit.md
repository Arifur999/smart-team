---
title: Kit Analysis — saas-motion-kit
section: 05_RESEARCH_NOTES/technique-breakdowns
type: reference
confidence: creator-tested
sources: [saas-motion-kit]
updated: 2026-10-26
---

# Kit analysis: saas-motion-kit

**Credit:** `tugrawork-creator/saas-motion-kit` (v1.4) · github.com/tugrawork-creator/saas-motion-kit · MIT licence per the repo · Analysed 2026-10-26.

## What it is

A template repo for promo and motion videos for software products. It is built on HyperFrames and Claude Code. Its single rule: **no two films should feel like the same film.**

## Parts and what we took

| Part | What it is | What we took |
|---|---|---|
| `creative/` | Seven questions per storyboard, tone matrix, variety rules, component forge, transition atlas, human layer, references | Tone matrix, variety checks, component forge method, reference credit policy |
| `playbook/` | 7-stage production playbook with a review gate at each stage | Stage and gate structure |
| `components/` | The clean-or-imaginary UI rule | Clean-or-imaginary rule and truthfulness limits |
| `docs/` | A 101-theme gallery (11 families) and a live transition atlas | Idea of themed visual languages grouped in families |
| `examples/` | Same story told six ways; a before/after variety audit; real prompts | Method: run the audit on your own first draft and learn from the repeats |
| `.claude/skills/saas-motion-video` | A skill that runs the whole process and stops at gates | Skill-with-gates design |
| `templates/` | Brief, storyboard, theme sheet | Ledger-style storyboard |
| `tools/` | Variety audit, theme picker, history report, delivery script, loop-seam check, warm UI SFX synth, reference breakdown tool | Ideas for scripts to build later |
| `.github/workflows` | Variety audit as a GitHub Action | Idea: automatic quality checks on every push |

## Key ideas ranked by value to us

1. **Decide message and tone before effects.** One sentence, then the tone sets the craft.
2. **The ledger plus the variety audit.** A table of every shot that a script can check for repetition.
3. **Gates with human taste.** The agent produces; the human decides at defined points.
4. **Clean or imaginary components, with truth limits.**
5. **Reference credit rule** (grammar yes, assets no).
6. **Render big, deliver small.** Render 4K, downscale with Lanczos.
7. **Seek-safe rendering lessons.**
8. **Sound: warm tuned timbres, not thin sine beeps.**
9. **Less text; no progress bars.**
10. **Human layer:** generated people are actors, never customers or testimonials; every shot with a person still needs a camera move and a product beat.

## Lessons in the README (kept)

Render at 4K and deliver smaller; every frame a pure function of time; loops use whole-number cycles; ship fonts with the needed glyph subsets; type uppercase yourself for languages with special casing; warm tuned sound; fewer words; no progress bars.

## Limits and cautions

- It is aimed at **SaaS promo films**. Local-business or dental promos will need different theme families (testimonials, before/after, clinic tours). Build those later in `09_RESOURCES`.
- The themes use fictional products. Replace with your clients' real products and honest claims.
- Third-party model licences matter (for example, non-commercial music generation models).
- We read the README and one creative file in full. We did not read every theme sheet or tool script. Read those if we build the audit scripts.

## Candidate additions to this base later

- A variety audit script for our ledger format.
- A theme picker that skips recently used themes.
- Local-business theme families.
