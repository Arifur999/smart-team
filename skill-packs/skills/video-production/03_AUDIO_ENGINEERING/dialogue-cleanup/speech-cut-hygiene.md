---
title: Speech Cut Hygiene (Audio Side of Editing)
section: 03_AUDIO_ENGINEERING/dialogue-cleanup
type: rule
confidence: creator-tested
sources: [herk-edit-kit, own-synthesis]
updated: 2026-10-26
---

# Speech cut hygiene

How to cut speech so it sounds natural and every word stays whole.

## Rules

1. **Cut between phrases at real silence.** A phrase is what someone says in one breath. Never cut inside one.
2. **Keep natural beats.** Pauses after a comma or list marker (0.2–0.4 s) are part of how people talk. Removing them makes speech sound robotic.
3. **Remove dead air** between phrases beyond about 0.2 s.
4. **Remove a filler only with silence on both sides.** A filler that runs into the next word stays; cutting it clips the neighbours.
5. **Never speed up the voice** to tighten an edit.
6. **Do not mute a word.** Fixing a "too quick" cut by adding silence in the middle of a phrase can make the adjacent word sound muted. Fewer cuts, all between phrases, is the better fix. In one case study the cleaner version ran several seconds longer and sounded better.
7. **Let words decay.** Transcripts often mark a word's end 40–80 ms before the consonant dies. Cut after the word has fully faded, not at the transcript end-time.
8. **Join two takes only where both sides are silent.** If they run together, play one take whole.
9. **Never fade the last spoken word.** End the file right after it, or hold room tone.
10. **Crossfade edits** that are not in silence. Very short (2–10 ms) crossfades prevent clicks.
11. **Fill gaps with room tone**, not digital silence.

## Verifying

- Transcribe the final render and compare with the raw at every cut.
- Then **listen** at every cut. A transcript alone is not proof: speech-to-text may guess a clipped word correctly while a listener hears it broken.
- Check lip sync against the raw footage at the cut frames and in the last ten seconds.

## For synthetic narration

- Level every line to the same loudness, then limit peaks only. Scaling a whole line down to fit one loud peak makes it noticeably quieter than the others.
- Re-transcribe the finished narration and compare to the script before every render.
- Put the narration, music, and sound effects on one beat grid so changing a line moves everything together.
