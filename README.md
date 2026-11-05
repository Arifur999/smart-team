# smart-team

One dashboard for AI agent teams running across your PCs on the same LAN.

Teams (planned): **nextDev** (development), **nextEditor** (video editing), **nextDesign** (design) and **NextMarketer** (marketing). Each team has a Team Leader, workers with team-specific skills and its own QA. A Manager sits above all teams, and a Final QA checks everything before it reaches you. Work that is not good enough goes back through a revision loop.

## Status

- **Phase 1, done:** PCs connect to the hub and the dashboard shows them online or offline live, with the tools and shared folders each PC offers.
- **Phase 2, done:** send a task to a PC and watch Claude Code work in a live terminal on the dashboard. Every task is planned first by the plan agent (Maria Hill) in Claude Code's read-only plan mode; work starts only when you click **Approve plan**. Type into the terminal to ask for a new plan or to tell Claude what to do next in the same session. **Cancel** stops the run on the PC.
- **Agent Office, done:** the home page is a live office per team (nextDev, nextEditor, nextDesign, NextMarketer) with desks and PCs, an R&D Lab, server racks, a pantry, a lounge and a rest room with beds. It is drawn as a pixel-art floor plan with corridors, glass walls, lamps and room head counts. Members carry hero names, one universe per team: Avengers in nextDev, X-Men in nextEditor, Fantastic Four in nextDesign and DC in NextMarketer, but they are original 3D chibi characters in their team's colours (no copied costumes or likenesses), rendered in Blender: they walk between rooms as their status changes, type at their desks, talk in speech bubbles and sleep in the rest room when their phase is not built yet. The top bar shows what needs you (Apply / Dismiss) and the task's stage; the right side shows the live terminal; team chat below the map reports every step. Click anyone for their portrait, role, how long they are working now and in total, tokens used (input, output, cache) and cost, plus their live log. Tasks belong to a team, and every run is credited to the member who did it.
- **Phase 3, done (Skill Packs):** every run loads the Claude Code skills of the member doing it. `skill-packs/manifest.json` says which skills each role gets (`planner`, `nextDev.worker`, …; a trailing `*` matches a prefix). The hub reads skills from `skill-packs/skills` and the hub PC's `SKILL_DIRS` (default `~/.claude/skills`) and versions each one by a hash of its files. Before a run the agent downloads any skill it does not have at that version, builds a throwaway plugin folder and starts Claude with `--plugin-dir`, so your project folder is never touched. The member card shows each skill and its version, and marks skills the hub cannot find.
- **Phase 4, done (Intake):** every task starts with Friday, the intake agent. She asks the team's questions one by one (each team has its own template in `packages/shared`), and you can answer in text, upload files, point to a folder on one of your PCs, or paste a link. Then Claude checks the brief read-only and Friday asks follow-up questions if something is unclear. You confirm the summary and Maria Hill plans from it. Uploaded files are cached on the PC that runs the task, and folders on that PC are opened to Claude with `--add-dir`; folders on other PCs are listed until cross-PC copying arrives (phase 7).
- **3D characters, done:** every member has a Blender render (stand, two walk frames, typing, sleeping) in `apps/dashboard/public/characters`, built from the looks in `apps/dashboard/src/lib/characters.json`. Members without a render fall back to the pixel sprite. See *Character renders* below.
- **Next:** nextDev team flow with Team Leader and Team QA (phase 5).

## How a task runs

1. **Tasks → New task:** pick a PC, one of its shared folders, and describe the work.
2. The PC's agent runs `claude -p --permission-mode plan` in that folder. Nothing is changed. The plan streams into the task's terminal.
3. **Approve plan** resumes the same Claude session with your PC's normal permission mode and carries the plan out.
4. Anything you type into the terminal goes to Claude as the next instruction, never to a shell.

Tasks only run inside folders the PC shares in `agent.config.json`; the hub and the agent both check this. Each PC runs one task at a time and queues the rest.

## Layout

| Path | What it is |
|---|---|
| `apps/hub` | NestJS + Prisma + Postgres. The central server. Runs on one PC (the hub PC). |
| `apps/node-agent` | Small service that runs on every PC. Registers the PC, reports its tools and folders, sends heartbeats. |
| `apps/dashboard` | Next.js web dashboard. Open it from any PC or phone on the LAN. |
| `packages/shared` | Types and event names shared by all three. |

## Requirements

- Node.js 24+
- Docker Desktop (for Postgres) on the hub PC
- Claude Code installed and signed in on every PC that will run agents

## Setup on the hub PC

```bash
npm install
npm run build:shared
npm run db:up
```

Create `apps/hub/.env` from `apps/hub/.env.example`. Generate the agent token once and use the same value on every PC:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Create the database tables and start the hub:

```bash
cd apps/hub
npx prisma migrate deploy
npx prisma generate
cd ../..
npm run dev:hub
```

Start the dashboard and open http://localhost:3000 (from other PCs: `http://<hub-pc-ip>:3000`):

```bash
npm run dev:dashboard
```

Windows Firewall will ask to allow Node.js the first time. Allow it on private networks so the other PCs can reach ports 3000 and 4000.

## Setup on every PC (including the hub PC)

```bash
npm install
npm run build:shared
```

1. Create `apps/node-agent/.env` from `.env.example`. Set `HUB_URL` to `http://<hub-pc-ip>:4000` and `AGENT_TOKEN` to the shared token. Set `DEVICE_NAME` if you want a friendlier name than the hostname (it must be unique per PC).
2. Copy `apps/node-agent/agent.config.example.json` to `agent.config.json`:
   - `folders`: the folders this PC shares, with tags such as `sfx`, `vfx-reference` or `code`. Tasks can only run inside these, and team leaders will route work by the tags.
   - `claude.permissionMode`: how approved work runs. `acceptEdits` (default) lets Claude edit files without asking; shell commands still need to be listed in `allowedTools`.
   - `claude.allowedTools`: commands approved work may run, e.g. `"Bash(npm test:*)"`. Anything not listed is refused and shows as an error in the terminal.
   - `claude.maxTurns`: optional cap on how long one run may go.
3. Start the agent:

```bash
npm run dev:agent
```

The PC appears on the dashboard within a few seconds. Stop the agent and it turns offline within 10 seconds.

## Character renders

The office characters are made by a Blender script from `apps/dashboard/src/lib/characters.json` (skin, hair style and colour, outfit, cape, visor, build). Change a look there, then render again with Blender 4.2 or newer:

```bash
blender -b --factory-startup -P apps/dashboard/scripts/characters/render_characters.py -- --looks apps/dashboard/src/lib/characters.json --out apps/dashboard/public/characters --size 256
```

Add `--ids hulk storm` to render only some members. All 26 members take about 3 minutes. The script writes `<id>/<pose>.png` and a `manifest.json` the dashboard reads to know who has a render.

## Checks

```bash
npm run typecheck
npm test
```
