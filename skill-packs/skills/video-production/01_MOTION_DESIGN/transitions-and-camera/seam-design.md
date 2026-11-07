---
title: Seam Design and Variety Rules
section: 01_MOTION_DESIGN/transitions-and-camera
type: rule
confidence: creator-tested
sources: [saas-motion-kit, herk-edit-kit, own-synthesis]
updated: 2026-10-26
---

# Seam design and variety rules

## Part 1: design the seam

A seam is where one beat ends and the next starts. Design both sides together.

1. **Name the matching move.** Write a comment on each exit and entry tween that names its partner (direction, distance, blur, duration). If you cannot name the partner, the seam is not designed.
2. **Same direction.** An exit upward pairs with an entry from below.
3. **Match velocity.** The exit ends at the speed the entry begins.
4. **Match blur.** If the exit ramps to 30 px blur, the entry starts at 30 px and ramps down.
5. **Fill the slot.** Every scene's slot must cover the whole time it should be visible. In HyperFrames a timeline that ends early holds its last frame, but a host slot shorter than its video goes blank (lint `subcomposition_blanks_before_host`). In other engines a short timeline can flash black; a zero-effect tween spanning the slot fixes it.
6. **Cover video edges.** Video elements flicker at start and go black after the source ends. Bracket them with still frames: a poster at the start and a last-frame still after the end.

## Part 2: variety rules (no two films, or two beats, feel the same)

The strongest idea in the saas-motion-kit: *decide the message and tone before picking effects, then check the storyboard for repetition.*

Before building, fill a **ledger**: one row per shot with length, tone, entrance, transition out, ease, direction, camera move, accent colour, and notes. Then check:

| Check | Fail condition |
|---|---|
| Transitions | The same transition type used more than twice |
| Entrances | The same entrance for every title or card |
| Eases | One ease used everywhere |
| Direction | Everything slides in from the same side |
| Shot lengths | All shots the same length |
| Surprise | No single moment that breaks the pattern |
| Accent colours | More than two accent colours in one shot |
| Tone fit | A calm or premium film with more than about 1.5 cuts per second, or urgent with holds over 2 s |
| New component | The film reuses every component from the last one |

**Deliberate repetition is allowed.** Mark it as a `motif:` in the ledger so a repeat is a choice, not an accident.

**One surprise rule.** Plan one moment that breaks the film's own pattern: a colour flood, a silence, an unexpected scale change. It is what people remember.

## Part 3: component forge (15 minutes)

When a film needs a new visual component (a gauge, a stave, a dial, a timeline):

1. Name the idea it must show in one sentence.
2. Pick a real-world object that behaves that way.
3. Strip it to three shapes and one colour.
4. Define two states (before / after) and the one motion between them.
5. Check it does not claim anything the product cannot do.
6. Give it a unique entrance that no other component in the film uses.

## Part 4: clean or imaginary UI

- Product UI is clean and consistent: rebuild the real components from design tokens (not screenshots).
- Product UI is cluttered or legacy: design simplified imaginary components in the brand's tokens.
- Either way, never fake capabilities, numbers, or customers. An imaginary component may simplify the product but may not claim anything it does not do. Label mocks as examples.
