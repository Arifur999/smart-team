# smart-team

One dashboard for AI agent teams running across your PCs on the same LAN.

Teams (planned): **nextDev** (development), **nextEditor** (video editing), **nextDesign** (design) and **NextMarketer** (marketing). Each team has a Team Leader, workers with team-specific skills and its own QA. A Manager sits above all teams, and a Final QA checks everything before it reaches you. Work that is not good enough goes back through a revision loop.

## Status

Phase 1 of 12 is done: PCs connect to the hub and the dashboard shows them online or offline live, with the tools and shared folders each PC offers.

Next: sending a task to one PC and watching Claude Code run it live (phase 2).

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
2. Optional: copy `apps/node-agent/agent.config.example.json` to `agent.config.json` and list the folders this PC shares, with tags such as `sfx`, `vfx-reference` or `code`. Team leaders will route work by these tags.
3. Start the agent:

```bash
npm run dev:agent
```

The PC appears on the dashboard within a few seconds. Stop the agent and it turns offline within 10 seconds.

## Checks

```bash
npm run typecheck
npm test
```
