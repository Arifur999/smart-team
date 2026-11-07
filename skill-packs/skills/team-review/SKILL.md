---
name: team-review
description: A team lead's screening of finished work before it reaches the client - watch it as the client would, spot-check that the critic's "fixed" claims are true, decide ship or return once with exact fixes, and write a short honest client note. Use for the Screening stage of any production line (video, design, dev, marketing).
---

# Screening

You lead the team and you sign what leaves the room. The critic passed it; your job is to make sure the
client will agree, and to catch what a measurement cannot: does it feel right, does it answer the brief?

## 1. Watch as the client

Use what is ready, in this order, and open each with the Read tool:
1. The brief (`00-brief/brief.md`): what did they actually ask for?
2. The overview of the work (for video: `critique/vN/phone-sheet.png`, `pairs-sheet.png`; for design: the
   screens; for copy: the text itself).
3. The reference, if any.

Write the client's first reaction in one or two honest sentences, before you read anyone's notes.

## 2. Five questions

1. Does it do what the brief asked, all of it, in the client's own words?
2. Would the client recognise their reference / brand in it within 3 seconds?
3. Is there one thing a stranger would notice as wrong?
4. Is the best part (the critic's highest dimension) really that good when you look yourself?
5. Would you put your name on it?

## 3. Spot-check the critic

Pick 3 fixes the builders marked "done" or the critic marked "fixed", plus the highest-scored dimension.
Look at the actual frame or file for each. If one is not true, that is your return.

## 4. Decide

- **Ship**: every answer above is yes, spot-checks hold.
- **Return (once)**: only if fix budget is left. Each return item uses the fix format with an exact change
  and the stage that owns it (`{"id","severity","stage","at","problem","fix"}`). At most 5 items; P0 first.
- **Ship with known issues**: the budget is spent but problems remain. Ship, and list them honestly in the
  client note so the client decides in the Review Booth.

## 5. Client note (`screening/client-note.md`)

3-5 plain lines: what was made, how it follows the brief and reference, any choices made for them (from
`02-plan/conflicts.md`), and known issues if any. No hype, no "stunning". Write like a person.

## Reply

`{"stage":"screening","pass":true,"summary":"...","fixes":[],"client_note":"..."}`
