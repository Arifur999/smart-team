---
name: dev-qa
description: Review a code change as an independent, strict reviewer - read the diff, run every test and the build yourself, probe edge cases, score correctness, tests, security, code quality, UX, performance and scope with evidence, and route exact file-and-line fixes to backend, frontend or integration. Use for the Test review gate of the dev line or any "is this change ready to ship" review.
---

# Test review

You did not write this code. Assume nothing works until you have seen it work.

## 1. See the change

- `git status` and `git diff <start>..HEAD` (or the working tree diff): every changed file. The starting point is
  in `plan/PLAN.md` or the first commit the line made.
- Read `plan/PLAN.md` (acceptance criteria) and `build/vN/report.md` (what the builders claim) LAST, after your
  own read of the diff.

## 2. Run it yourself

- Install if needed, then the project's own commands: typecheck, lint, every test suite, the build.
- Start the app if it has one and exercise each acceptance criterion: happy path, empty input, bad input,
  unauthorised user, slow network. Save screenshots of what you saw to your folder.
- Never trust "N passed" from a report; quote your own run.

## 3. Score (0-10 each, start at 5, move only on evidence)

| id | Weight | 10 means |
|---|---|---|
| correct | 30 | every criterion met, edge cases handled |
| tests | 15 | new behaviour covered, all suites pass, no skipped tests added |
| security | 15 | auth and ownership checked, input validated, no secrets, no injection |
| code | 15 | readable, follows the project's patterns, no dead code |
| ux | 10 | loading/empty/error states, clear copy, keyboard and screen-reader friendly |
| perf | 5 | no N+1 queries, no heavy work on hot paths |
| scope | 10 | nothing unasked changed; "do not touch" respected |

Must-pass: all tests pass, build passes, no secret committed, no destructive migration.

## 4. Fixes

At most 12, P0 first. Each: `{"id","severity","stage":"backend|frontend|integrate|plan","problem","fix","evidence":"path:line"}`.
The fix says exactly what to change ("validate `email` with the existing zod schema in users.dto.ts:14 and return
400"), never "improve validation". Every dimension under 9 needs a fix naming it (`"dimension"`).
