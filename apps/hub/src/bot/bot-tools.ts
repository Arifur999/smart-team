import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { LEADERSHIP, TEAM_IDS, TEAMS, totalTokens, type BotAction, type TeamId, type TeamMember } from '@smart-team/shared';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DevicesService } from '../devices/devices.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TaskActions } from '../tasks/task-actions.js';
import { isFinished, TasksService } from '../tasks/tasks.service.js';
import { isInsideFolders } from '../tasks/work-dir.js';

export interface BotToolDeps {
  prisma: PrismaService;
  tasks: TasksService;
  devices: DevicesService;
  taskActions: TaskActions;
}

const teamId = z.enum(TEAM_IDS as [TeamId, ...TeamId[]]);
const LOG_LINES = 25;
const LINE_CHARS = 300;

const json = (value: unknown) => JSON.stringify(value);
const clip = (text: string, max = LINE_CHARS) => (text.length > max ? `${text.slice(0, max)}…` : text);

/**
 * The tools the command bot can use. Reading tools return live data from the hub; `create_task` acts
 * straight away, and cancelling, approving or instructing a task only puts Confirm buttons in front of
 * you. Every action is recorded in `actions`, which end up as cards under the bot's reply.
 */
export function botTools(deps: BotToolDeps, actions: BotAction[]) {
  const { prisma, tasks, devices, taskActions } = deps;

  const listPcs = betaZodTool({
    name: 'list_pcs',
    description: 'List the PCs connected to the hub: online or offline, OS, installed tools, and the shared folders tasks can run in (with tags).',
    inputSchema: z.object({}),
    run: async () => {
      const all = await devices.list();
      return json(
        all.map((d) => ({
          name: d.name,
          status: d.status,
          platform: d.platform,
          lastSeen: d.lastSeenAt,
          tools: d.resources.filter((r) => r.kind === 'TOOL').map((r) => (r.version ? `${r.name} ${r.version}` : r.name)),
          folders: d.resources.filter((r) => r.kind === 'FOLDER').map((r) => ({ path: r.path, tags: r.tags })),
        })),
      );
    },
  });

  const listTasks = betaZodTool({
    name: 'list_tasks',
    description:
      'List tasks, newest first, with status (INTAKE = Friday is collecting the brief, QUEUED, RUNNING, AWAITING_APPROVAL = plan waiting for the user, SUCCEEDED, FAILED, CANCELLED), team, PC and cost. Filter by team and/or status.',
    inputSchema: z.object({
      team: teamId.optional(),
      status: z.enum(['INTAKE', 'QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'SUCCEEDED', 'FAILED', 'CANCELLED']).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    run: async ({ team, status, limit }) => {
      const found = (await tasks.list(200)).filter((t) => (!team || t.team === team) && (!status || t.status === status)).slice(0, limit ?? 20);
      return json(
        found.map((t) => ({
          id: t.id,
          team: t.team,
          title: t.title,
          status: t.status,
          stage: t.mode,
          pc: t.deviceName,
          folder: t.workDir,
          created: t.createdAt,
          finished: t.finishedAt,
          costUsd: t.costUsd,
        })),
      );
    },
  });

  const taskReport = betaZodTool({
    name: 'task_report',
    description: "Full report on one task: status, stage, PC, folder, the brief's state, final outcome, and the last lines of its live terminal log.",
    inputSchema: z.object({ taskId: z.string().uuid() }),
    run: async ({ taskId }) => {
      const detail = await tasks.detail(taskId);
      return json({
        id: detail.id,
        team: detail.team,
        title: detail.title,
        status: detail.status,
        stage: detail.mode,
        briefPhase: detail.intakePhase,
        pc: detail.deviceName,
        folder: detail.workDir,
        started: detail.startedAt,
        finished: detail.finishedAt,
        outcome: detail.outcome ? clip(detail.outcome, 2000) : null,
        costUsd: detail.costUsd,
        canApprovePlan: detail.canApprove,
        canSendInstruction: detail.canFollowUp,
        lastLogLines: detail.lines.slice(-LOG_LINES).map((l) => `[${l.kind}] ${clip(l.text)}`),
      });
    },
  });

  const teamReport = betaZodTool({
    name: 'team_report',
    description: "Everything about one team: its members (role, runs, time worked, tokens, cost, what each is doing now), its recent tasks and totals.",
    inputSchema: z.object({ team: teamId }),
    run: async ({ team }) => {
      const info = TEAMS.find((t) => t.id === team)!;
      const [stats, running, teamTasks] = await Promise.all([tasks.agentStats(), runningByAgent(prisma), tasks.list(200)]);
      const mine = teamTasks.filter((t) => t.team === team);
      const members = info.members.map((m) => memberReport(m, stats, running));
      return json({
        team: info.id,
        focus: info.focus,
        members,
        totals: {
          tokens: members.reduce((sum, m) => sum + m.tokens, 0),
          costUsd: round(members.reduce((sum, m) => sum + m.costUsd, 0)),
          tasks: countBy(mine.map((t) => t.status)),
        },
        recentTasks: mine.slice(0, 10).map((t) => ({ id: t.id, title: t.title, status: t.status, pc: t.deviceName, created: t.createdAt })),
        note: 'The plan agent (Maria Hill) and intake agent (Friday) work for every team; ask agent_report about them.',
      });
    },
  });

  const agentReport = betaZodTool({
    name: 'agent_report',
    description:
      'Report on one team member or leadership agent by name or id (e.g. "Hulk", "maria-hill", "Friday"): role, runs, time worked, tokens, cost, and their current or last run with its last log lines.',
    inputSchema: z.object({ agent: z.string().min(1) }),
    run: async ({ agent }) => {
      const found = findMember(agent);
      if (!found) return json({ error: `No member called "${agent}". Members: ${allMembers().map((m) => m.member.name).join(', ')}` });

      const [stats, running] = await Promise.all([tasks.agentStats(), runningByAgent(prisma)]);
      const last = await prisma.run.findFirst({
        where: { agentId: found.member.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          status: true,
          mode: true,
          startedAt: true,
          finishedAt: true,
          outcome: true,
          task: { select: { id: true, title: true, team: true } },
          logs: { orderBy: { seq: 'desc' }, take: 15, select: { kind: true, text: true } },
        },
      });
      return json({
        ...memberReport(found.member, stats, running),
        team: found.team ?? 'Leadership (works for every team)',
        lastRun: last && {
          task: last.task,
          stage: last.mode,
          status: last.status,
          started: last.startedAt,
          finished: last.finishedAt,
          outcome: last.outcome ? clip(last.outcome, 1500) : null,
          lastLogLines: last.logs.reverse().map((l) => `[${l.kind}] ${clip(l.text)}`),
        },
      });
    },
  });

  const createTask = betaZodTool({
    name: 'create_task',
    description:
      'Assign new work to a team. Creates the task on a PC and one of its shared folders, then Friday (the intake agent) starts asking the user for the brief on the task page. Leave pc/folder out only when there is one obvious choice; the tool tells you the options otherwise.',
    inputSchema: z.object({
      team: teamId,
      title: z.string().min(3).max(120).describe('Short task title, in English.'),
      instructions: z.string().min(3).max(8000).describe("What the user wants done, in English, in the user's own words as far as possible."),
      pc: z.string().optional().describe('PC name from list_pcs.'),
      folder: z.string().optional().describe('A shared folder path on that PC (or inside one), or a folder tag such as "code".'),
    }),
    run: async ({ team, title, instructions, pc, folder }) => {
      const all = (await devices.list()).filter((d) => d.resources.some((r) => r.kind === 'FOLDER'));
      const online = all.filter((d) => d.status === 'ONLINE');

      let device = pc ? all.find((d) => d.name.toLowerCase() === pc.toLowerCase()) ?? all.find((d) => d.name.toLowerCase().includes(pc.toLowerCase())) : undefined;
      if (pc && !device) return json({ error: `No PC called "${pc}". PCs with shared folders: ${all.map((d) => `${d.name} (${d.status})`).join(', ') || 'none'}` });
      if (!device) {
        if (online.length !== 1) {
          return json({ needsChoice: 'pc', message: 'Ask the user which PC to use.', options: online.map((d) => d.name), offline: all.filter((d) => d.status !== 'ONLINE').map((d) => d.name) });
        }
        device = online[0]!;
      }

      const folders = device.resources.filter((r) => r.kind === 'FOLDER' && r.path).map((r) => ({ path: r.path!, tags: r.tags }));
      let workDir: string | undefined;
      if (folder) {
        workDir = folders.find((f) => f.tags.some((t) => t.toLowerCase() === folder.toLowerCase()))?.path;
        if (!workDir && isInsideFolders(folder, folders.map((f) => f.path), device.platform)) workDir = folder;
        if (!workDir) return json({ error: `"${folder}" is not a shared folder on ${device.name}.`, options: folders });
      } else if (folders.length === 1) {
        workDir = folders[0]!.path;
      } else {
        return json({ needsChoice: 'folder', message: `Ask the user which folder on ${device.name} to use.`, options: folders });
      }

      const task = await taskActions.start({ team, title, prompt: instructions, deviceId: device.id, workDir });
      actions.push({ kind: 'task-created', id: randomUUID(), taskId: task.id, team, title: task.title });
      return json({
        created: { id: task.id, team, title: task.title, pc: task.deviceName, folder: task.workDir, status: task.status },
        next: 'Friday is now asking for the brief on the task page. The plan and the work start once the user confirms the brief.',
        pcOffline: device.status !== 'ONLINE' ? `${device.name} is offline; the task waits until it is back.` : undefined,
      });
    },
  });

  const requestConfirmation = betaZodTool({
    name: 'request_confirmation',
    description:
      "Put Confirm / Cancel buttons in front of the user for an action on a task: cancel it, approve its plan, or send an instruction to its Claude session. Nothing happens until the user clicks Confirm. Use it for every such request, even when the user already said yes; never claim the action is done.",
    inputSchema: z.object({
      action: z.enum(['cancel', 'approve', 'instruct']),
      taskId: z.string().uuid(),
      instruction: z.string().min(1).max(8000).optional().describe('Required for instruct: the message for Claude, in English.'),
    }),
    run: async ({ action, taskId, instruction }) => {
      const detail = await tasks.detail(taskId);
      if (action === 'approve' && !detail.canApprove) return json({ error: `"${detail.title}" has no plan waiting for approval (status ${detail.status}).` });
      if (action === 'instruct' && !instruction) return json({ error: 'Give the instruction text.' });
      if (action === 'instruct' && !detail.canFollowUp) return json({ error: `"${detail.title}" cannot take an instruction now (status ${detail.status}).` });
      if (action === 'cancel' && isFinished(detail.status)) return json({ error: `"${detail.title}" has already ended (${detail.status}).` });

      actions.push({ kind: 'confirm', id: randomUUID(), action, taskId, title: detail.title, answer: null, ...(instruction ? { text: instruction } : {}) });
      return json({ shown: true, message: 'The user now sees Confirm and Cancel buttons. Tell them to click one; do not say it is done.' });
    },
  });

  return [listPcs, listTasks, taskReport, teamReport, agentReport, createTask, requestConfirmation];
}

type Stats = Awaited<ReturnType<TasksService['agentStats']>>;
type Running = Map<string, { taskId: string; title: string; stage: string }>;

/** What each agent is running right now, by agent id. */
async function runningByAgent(prisma: PrismaService): Promise<Running> {
  const runs = await prisma.run.findMany({
    where: { status: 'RUNNING', agentId: { not: null } },
    select: { agentId: true, mode: true, task: { select: { id: true, title: true } } },
  });
  return new Map(runs.map((r) => [r.agentId!, { taskId: r.task.id, title: r.task.title, stage: r.mode }]));
}

function memberReport(member: TeamMember, stats: Stats, running: Running) {
  const s = stats.find((x) => x.agentId === member.id);
  return {
    id: member.id,
    name: member.name,
    title: member.title,
    runs: s?.runs ?? 0,
    secondsWorked: s?.activeSeconds ?? 0,
    tokens: s ? totalTokens(s.usage) : 0,
    costUsd: round(s?.costUsd ?? 0),
    now: running.get(member.id) ?? 'idle',
  };
}

function allMembers(): { member: TeamMember; team: TeamId | null }[] {
  return [...LEADERSHIP.map((member) => ({ member, team: null })), ...TEAMS.flatMap((t) => t.members.map((member) => ({ member, team: t.id })))];
}

/** Finds a member by id or name, ignoring case, spaces and dashes ("spiderman" finds Spider-Man). */
export function findMember(query: string) {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const q = key(query);
  if (!q) return undefined;
  return allMembers().find(({ member }) => key(member.id) === q || key(member.name) === q) ?? allMembers().find(({ member }) => key(member.name).includes(q));
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  return counts;
}

const round = (n: number) => Math.round(n * 100) / 100;
