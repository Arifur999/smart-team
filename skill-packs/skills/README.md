# Team skills

One folder per skill with a `SKILL.md` at its root (same format as `~/.claude/skills`). The hub looks here
first, then in `skill-packs/local/` (PC-only, gitignored: client brand kits like `naxified-brand`, skills we
may not redistribute), then in `SKILL_DIRS`. `../manifest.json` says who gets what.

Written for smart-team:

| Skill | Who | What |
|---|---|---|
| production-line | every line stage | folder map, versions, fixes, the JSON reply, Windows rules |
| house-rules | every line stage | reading and writing the client's permanent rules |
| reference-match | Wolverine, Cyclops, Beast | read a reference A to Z (`scripts/analyze_reference.py`) |
| video-qa | Beast, Cyclops | the critic: `scripts/measure.py`, rubric, must-pass, `scripts/verdict.py` |
| storyboard-keyframes | Jean Grey | style frames before motion (`scripts/pair_sheet.py`) |
| motion-light-recipes | Jean Grey, Storm, Beast, Cyclops | beams, bloom, lit surfaces, holds, floods, logo in light |
| sound-pass | Jean Grey | music bed, cues, -14 LUFS mix, licences |
| team-review | team leaders | screening before the client |
| final-qa | Captain Marvel | prove every brief requirement |
| intake-brief | Friday | brief check |

Copied from elsewhere (licences kept in each folder, sources in `../vendor.json`, refresh with
`python scripts/skills-lock.py`): video-production, humanizer, prompt-master, skill-creator, frontend-design,
accessibility-audit, design-critique, interaction-design, ux-writing, creative, map-design.

The Python scripts are standard library only and call ffmpeg/ffprobe with argument lists. `ffkit.py` is
shared and copied into each skill's `scripts/` (a skill is shipped to agents on its own).
