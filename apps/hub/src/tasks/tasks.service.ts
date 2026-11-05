import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FIRST_AGENT_SEQ,
  runAgentId,
  type AgentStats,
  type CreateTaskInput,
  type FinishedRunStatus,
  type LogEntry,
  type LogKind,
  type RunMode,
  type TaskDetail,
  type TaskStatus,
  type TaskSummary,
  type TeamId,
  type TokenUsage,
} from '@smart-team/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const NEWEST_FIRST = [{ createdAt: 'desc' }, { id: 'desc' }] as const satisfies Prisma.RunOrderByWithRelationInput[];

const RUN_SELECT = {
  id: true,
  deviceId: true,
  workDir: true,
  mode: true,
  status: true,
  sessionId: true,
  outcome: true,
  costUsd: true,
  startedAt: true,
  finishedAt: true,
  device: { select: { name: true } },
  task: { select: { team: true } },
} satisfies Prisma.RunSelect;

const TASK_SELECT = {
  id: true,
  team: true,
  title: true,
  createdAt: true,
  deviceId: true,
  workDir: true,
  device: { select: { name: true } },
  brief: { select: { phase: true } },
  // The newest run is the task's current state once the brief is locked.
  runs: { select: RUN_SELECT, orderBy: NEWEST_FIRST, take: 1 },
} satisfies Prisma.TaskSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_SELECT }>;
type RunRow = Prisma.RunGetPayload<{ select: typeof RUN_SELECT }>;

/** What the executing session is told once you approve its plan. */
export const APPROVAL_PROMPT = 'The plan is approved. Carry it out now, step by step, and summarize what you changed when you are done.';

export interface StartableRun {
  id: string;
  taskId: string;
  team: TeamId;
  prompt: string;
  workDir: string;
  mode: RunMode;
  resumeSessionId?: string;
}

/** Data access for tasks and runs. Sending things to agents or the dashboard is RunDispatcher's job. */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every task starts with the intake: no run exists until the intake agent queues its brief check. */
  async create(input: CreateTaskInput): Promise<TaskSummary> {
    const task = await this.prisma.task.create({
      data: { team: input.team, title: input.title, deviceId: input.deviceId, workDir: input.workDir, brief: { create: {} } },
      select: { id: true },
    });
    return this.summary(task.id);
  }

  /** Queues a run on the task's own PC and folder. Used by the intake for its brief check and for the plan. */
  async queueRun(taskId: string, mode: RunMode, prompt: string): Promise<void> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { team: true, deviceId: true, workDir: true } });
    if (!task?.deviceId || !task.workDir) throw new NotFoundException('Task not found');
    await this.addRun(taskId, { team: task.team, deviceId: task.deviceId, workDir: task.workDir, prompt, mode });
  }

  async approve(taskId: string): Promise<void> {
    const run = await this.newestRun(taskId);
    if (taskStatus(run) !== 'AWAITING_APPROVAL') throw new ConflictException('There is no plan waiting for approval.');
    await this.addRun(taskId, { ...continueFrom(run), prompt: APPROVAL_PROMPT, mode: 'EXECUTE' });
  }

  /**
   * A message typed into the task's terminal. While a plan waits for approval it asks for a new plan;
   * after work has started it continues the same session.
   */
  async followUp(taskId: string, prompt: string): Promise<void> {
    if ((await this.summary(taskId)).status === 'INTAKE') throw new ConflictException('Answer the intake agent in the brief chat first.');
    const run = await this.newestRun(taskId);
    if (!isFinished(run.status)) throw new ConflictException('Wait for the current run to finish first.');
    await this.addRun(taskId, { ...continueFrom(run), prompt, mode: run.mode });
  }

  async list(limit = 50): Promise<TaskSummary[]> {
    const tasks = await this.prisma.task.findMany({ select: TASK_SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit });
    return tasks.map(toSummary);
  }

  async summary(taskId: string): Promise<TaskSummary> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: TASK_SELECT });
    if (!task) throw new NotFoundException('Task not found');
    return toSummary(task);
  }

  async detail(taskId: string): Promise<TaskDetail> {
    const summary = await this.summary(taskId);
    const logs = await this.prisma.runLog.findMany({
      where: { run: { taskId } },
      select: { runId: true, seq: true, kind: true, text: true, at: true },
      orderBy: [{ run: { createdAt: 'asc' } }, { runId: 'asc' }, { seq: 'asc' }],
    });

    const status = summary.status;
    return {
      ...summary,
      lines: logs.map((l) => ({ runId: l.runId, seq: l.seq, kind: l.kind as LogKind, text: l.text, at: l.at.toISOString() })),
      canFollowUp: isFinished(status) || status === 'AWAITING_APPROVAL',
      canApprove: status === 'AWAITING_APPROVAL',
    };
  }

  async newestRun(taskId: string): Promise<RunRow> {
    const run = await this.prisma.run.findFirst({ where: { taskId }, select: RUN_SELECT, orderBy: NEWEST_FIRST });
    if (!run) throw new NotFoundException('Task not found');
    return run;
  }

  /**
   * Moves the device's oldest queued run to RUNNING, unless the device is already running one.
   * The conditional update makes a second concurrent claim of the same run a no-op.
   */
  async claimNextQueued(deviceId: string, now = new Date()): Promise<StartableRun | null> {
    const busy = await this.prisma.run.count({ where: { deviceId, status: 'RUNNING' } });
    if (busy > 0) return null;

    const next = await this.prisma.run.findFirst({
      where: { deviceId, status: 'QUEUED' },
      select: { id: true, taskId: true, workDir: true, prompt: true, mode: true, task: { select: { team: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (!next) return null;

    const { count } = await this.prisma.run.updateMany({
      where: { id: next.id, status: 'QUEUED' },
      data: { status: 'RUNNING', startedAt: now },
    });
    if (count === 0) return null;

    // Continue the conversation of the task's previous run by the same kind of agent on this device:
    // the intake agent resumes its own checks, the planner and worker share theirs.
    const sameAgent: RunMode[] = next.mode === 'INTAKE' ? ['INTAKE'] : ['PLAN', 'EXECUTE'];
    const previous = await this.prisma.run.findFirst({
      where: { taskId: next.taskId, deviceId, id: { not: next.id }, sessionId: { not: null }, mode: { in: sameAgent } },
      select: { sessionId: true },
      orderBy: NEWEST_FIRST,
    });

    const { task, ...run } = next;
    return { ...run, team: task.team, ...(previous?.sessionId ? { resumeSessionId: previous.sessionId } : {}) };
  }

  /** The run's task id, but only when the run belongs to this device. Agents may only report on their own runs. */
  async taskIdOfOwnedRun(runId: string, deviceId: string): Promise<string | null> {
    const run = await this.prisma.run.findFirst({ where: { id: runId, deviceId }, select: { taskId: true } });
    return run?.taskId ?? null;
  }

  async appendLogs(runId: string, entries: LogEntry[]): Promise<void> {
    await this.prisma.runLog.createMany({
      // Seq below FIRST_AGENT_SEQ is reserved for the hub's own prompt line.
      data: entries.filter((e) => e.seq >= FIRST_AGENT_SEQ).map((e) => ({ runId, seq: e.seq, kind: e.kind, text: e.text, at: new Date(e.at) })),
      skipDuplicates: true,
    });
  }

  /** Stores a run's running token total while it goes. */
  async updateUsage(runId: string, usage: TokenUsage): Promise<void> {
    await this.prisma.run.updateMany({ where: { id: runId, status: 'RUNNING' }, data: tokenColumns(usage) });
  }

  /** Ends a run that is still queued or running. Returns false when it had already ended. */
  async finish(
    runId: string,
    result: { status: FinishedRunStatus; outcome?: string; costUsd?: number; sessionId?: string; usage?: TokenUsage },
    now = new Date(),
  ): Promise<boolean> {
    const { count } = await this.prisma.run.updateMany({
      where: { id: runId, status: { in: ['QUEUED', 'RUNNING'] } },
      data: {
        status: result.status,
        outcome: result.outcome ?? null,
        costUsd: result.costUsd ?? null,
        finishedAt: now,
        ...(result.sessionId ? { sessionId: result.sessionId } : {}),
        ...(result.usage ? tokenColumns(result.usage) : {}),
      },
    });
    return count > 0;
  }

  /** Time, tokens and cost per team member, over all their runs. Members without runs are left out. */
  async agentStats(now = new Date()): Promise<AgentStats[]> {
    const rows = await this.prisma.$queryRaw<
      {
        agentId: string;
        runs: bigint;
        activeSeconds: number | null;
        input: bigint;
        output: bigint;
        cacheRead: bigint;
        cacheCreation: bigint;
        costUsd: Prisma.Decimal | null;
        currentRunStartedAt: Date | null;
      }[]
    >`
      SELECT "agentId",
             count(*) AS runs,
             sum(extract(epoch FROM coalesce("finishedAt", ${now}) - "startedAt"))::float8 AS "activeSeconds",
             sum("inputTokens") AS input,
             sum("outputTokens") AS output,
             sum("cacheReadTokens") AS "cacheRead",
             sum("cacheCreationTokens") AS "cacheCreation",
             sum("costUsd") AS "costUsd",
             max("startedAt") FILTER (WHERE status = 'RUNNING') AS "currentRunStartedAt"
        FROM runs
       WHERE "agentId" IS NOT NULL AND "startedAt" IS NOT NULL
       GROUP BY "agentId"`;

    return rows.map((r) => ({
      agentId: r.agentId,
      runs: Number(r.runs),
      activeSeconds: Math.round(r.activeSeconds ?? 0),
      usage: { input: Number(r.input), output: Number(r.output), cacheRead: Number(r.cacheRead), cacheCreation: Number(r.cacheCreation) },
      costUsd: r.costUsd === null ? 0 : Number(r.costUsd),
      currentRunStartedAt: r.currentRunStartedAt?.toISOString() ?? null,
    }));
  }

  /** Fails every run the device was in the middle of. Returns the affected task ids. */
  async failRunning(deviceId: string, reason: string, now = new Date()): Promise<string[]> {
    const running = await this.prisma.run.findMany({ where: { deviceId, status: 'RUNNING' }, select: { id: true, taskId: true } });
    if (running.length === 0) return [];

    await this.prisma.run.updateMany({
      where: { id: { in: running.map((r) => r.id) }, status: 'RUNNING' },
      data: { status: 'FAILED', outcome: reason, finishedAt: now },
    });
    return running.map((r) => r.taskId);
  }

  /** Queues a run, credits it to a team member and writes its instruction as the first terminal line. */
  private async addRun(taskId: string, run: { team: TeamId; deviceId: string; workDir: string; prompt: string; mode: RunMode }) {
    await this.prisma.run.create({
      data: {
        taskId,
        deviceId: run.deviceId,
        workDir: run.workDir,
        prompt: run.prompt,
        mode: run.mode,
        agentId: runAgentId(run.team, run.mode),
        logs: { create: { seq: 0, kind: 'prompt', text: run.prompt, at: new Date() } },
      },
      select: { id: true },
    });
  }
}

function continueFrom(run: RunRow) {
  return { team: run.task.team, deviceId: run.deviceId, workDir: run.workDir };
}

function tokenColumns(u: TokenUsage) {
  return { inputTokens: u.input, outputTokens: u.output, cacheReadTokens: u.cacheRead, cacheCreationTokens: u.cacheCreation };
}

export function isFinished(status: TaskStatus): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED';
}

export function taskStatus(run: Pick<RunRow, 'mode' | 'status'>): TaskStatus {
  return run.mode === 'PLAN' && run.status === 'SUCCEEDED' ? 'AWAITING_APPROVAL' : run.status;
}

function toSummary(task: TaskRow): TaskSummary {
  const run = task.runs[0];
  const intakePhase = task.brief?.phase ?? null;
  // Until the brief is locked the task is in intake, whatever the intake agent's own runs are doing.
  const inIntake = intakePhase !== null && intakePhase !== 'LOCKED';
  const deviceId = task.deviceId ?? run?.deviceId;
  const workDir = task.workDir ?? run?.workDir;
  if (!deviceId || !workDir) throw new Error(`Task ${task.id} has no PC`);

  return {
    id: task.id,
    team: task.team,
    title: task.title,
    status: inIntake || !run ? 'INTAKE' : taskStatus(run),
    mode: inIntake || !run ? 'INTAKE' : run.mode,
    intakePhase,
    deviceId,
    deviceName: task.device?.name ?? run?.device.name ?? 'Unknown PC',
    workDir,
    createdAt: task.createdAt.toISOString(),
    startedAt: run?.startedAt?.toISOString() ?? null,
    finishedAt: run?.finishedAt?.toISOString() ?? null,
    outcome: run?.outcome ?? null,
    costUsd: run?.costUsd ? run.costUsd.toNumber() : null,
  };
}
