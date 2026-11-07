---
name: house-rules
description: How the team keeps the client's feedback as permanent house rules so the same mistake never happens twice - reading the active rules in a stage prompt, applying and checking them, and writing new rules from the client's send-back notes in the right format. Use on every production-line stage and whenever turning feedback into a rule.
---

# House rules

The client should never have to say the same thing twice. Every time they send work back, the reason becomes
a rule the whole team follows from then on.

## Reading rules

Your stage prompt has a "House rules" section with the active rules for this team and stage:
`- R-ED-003 Titles sit in the light: <rule> (check: <how to test>)`.

- Builders: follow every rule. If a rule conflicts with the brief, the brief wins; say so in your reply.
- Critics: every rule with a `check` is must-pass MP9. Test each one and list it in `must_pass` as
  `{"id":"R-ED-003","ok":true,"evidence":"..."}`.

## Where rules live

`skill-packs/house-rules/` on the hub:
- `global.md`: every team.
- `<team>.md` (for example `nextEditor.md`).
- `clients/<client>.md`: one client's taste.

## Format (one section per rule)

```markdown
## R-ED-011 End card on white, never on brand green
- status: active
- applies: storyboard, animate, critique
- rule: The end card sits on a full white flood like the reference; brand green is for accents only.
- why: Client sent v2 back on 2026-11-07: "keep the end card white like the reference".
- check: Mean luma of the end-card frames >= 230.
- source: task <id> review note Y1
```

- `id`: prefix by scope (R-GL global, R-ED nextEditor, R-DV nextDev, R-DS nextDesign, R-MK marketing,
  R-<CLIENT> client) and the next free number.
- `status`: proposed (written, waiting for the client's OK), active, retired.
- `applies`: stage keys, comma separated, or `all`.
- `rule`: one sentence, an instruction, with a number when possible.
- `check`: how a critic tests it from the files. Leave it out only if it cannot be tested.

## Writing rules from feedback (Rule keeper)

When asked to turn notes into rules:
1. One rule per distinct idea. Generalise one level ("the end card on white"), not more ("always use white").
2. Skip notes that are one-off content changes ("change the word X to Y" for this film only).
3. If a similar rule exists, tighten it instead of adding a new one.
4. New rules start as `status: proposed`; the client approves them (with Trust on, rules made from the
   client's own words may start active).
5. Keep at most 25 active rules per team: retire the weakest when adding.
