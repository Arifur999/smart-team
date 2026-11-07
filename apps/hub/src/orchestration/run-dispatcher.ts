import { Injectable, Logger } from '@nestjs/common';
import {
  AgentEvents,
  MIN_LINE_AGENT_VERSION,
  type RunCancelPayload,
  type RunFinishedPayload,
  type RunLogPayload,
  type RunRole,
  type RunStartPayload,
} from '@smart-team/shared';
import { AssetsService } from '../intake/assets.service.js';
import { SkillsService } from '../skills/skills.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { AgentRegistry } from './agent-registry.js';
import { DashboardGateway } from './dashboard.gateway.js';

/** One run that has ended, for the services that react to it. */
export interface RunEndedEvent {
  taskId: string;
  runId: string;
  deviceId: string;
}

type RunEndedListener = (event: RunEndedEvent) => Promise<void>;

/** Moves runs between the database, the agents and the dashboard. */
@Injectable()
export class RunDispatcher {
  private readonly logger = new Logger(RunDispatcher.name);
  /**
   * Per-device promise chain, so two triggers at once cannot start two runs on one PC. Only claiming and
   * sending happen inside it: run-ended listeners run after the link, because a listener that queues the
   * next run (and waits for it to be dispatched) would otherwise wait on itself.
   */
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly endedListeners: RunEndedListener[] = [];

  constructor(
    private readonly tasks: TasksService,
    private readonly agents: AgentRegistry,
    private readonly dashboard: DashboardGateway,
    private readonly skills: SkillsService,
    private readonly assets: AssetsService,
  ) {}

  /** Lets other services react when one of a task's runs ends (the intake agent picks up its brief check this way). */
  onRunEnded(listener: RunEndedListener) {
    this.endedListeners.push(listener);
  }

  /** Starts the device's next queued run if it is online and idle. Safe to call any time. */
  dispatch(deviceId: string): Promise<void> {
    const previous = this.queues.get(deviceId) ?? Promise.resolve();
    const link = previous
      .then(() => this.startNext(deviceId))
      .catch((error: unknown) => {
        this.logger.error(`dispatch to ${deviceId} failed`, error);
        return null;
      });
    this.queues.set(deviceId, link);
    return link.then(async (unsent) => {
      if (!unsent) return;
      await this.ended(unsent);
      this.kick(deviceId);
    });
  }

  /** Dispatch without waiting for it: for callers that hold their own locks. */
  kick(deviceId: string): void {
    void this.dispatch(deviceId);
  }

  /** Call after a run was added to a task: tells dashboards, then starts it if the PC is free. */
  async queued(taskId: string): Promise<void> {
    const run = await this.tasks.newestRun(taskId);
    await this.refresh(taskId);
    await this.dispatch(run.deviceId);
  }

  /** Stops the task's queued or running run, if it has one. */
  async cancel(taskId: string): Promise<void> {
    const run = await this.tasks.activeRun(taskId);
    if (run) await this.cancelRun(run.id);
  }

  /** Stops one run: a queued one (or one on a disconnected PC) ends now, a running one is stopped by its agent. */
  async cancelRun(runId: string): Promise<void> {
    const run = await this.tasks.runById(runId);
    if (!run) return;
    if (run.status === 'QUEUED' || (run.status === 'RUNNING' && !this.agents.isConnected(run.deviceId))) {
      if (await this.tasks.finish(run.id, { status: 'CANCELLED', outcome: 'Cancelled before it finished.' })) {
        await this.ended({ taskId: run.taskId, runId: run.id, deviceId: run.deviceId });
      }
      return;
    }
    if (run.status === 'RUNNING') {
      // The agent stops Claude and reports CANCELLED through onFinished.
      this.agents.send(run.deviceId, AgentEvents.runCancel, { runId: run.id } satisfies RunCancelPayload);
    }
  }

  async onLogs(deviceId: string, payload: RunLogPayload): Promise<void> {
    const taskId = await this.tasks.taskIdOfOwnedRun(payload.runId, deviceId);
    if (!taskId) return;
    if (payload.usage) await this.tasks.updateUsage(payload.runId, payload.usage);
    if (payload.entries.length === 0) return;
    await this.tasks.appendLogs(payload.runId, payload.entries);
    this.dashboard.pushLogs({ taskId, lines: payload.entries.map((e) => ({ ...e, runId: payload.runId })) });
  }

  async onFinished(deviceId: string, payload: RunFinishedPayload): Promise<void> {
    const taskId = await this.tasks.taskIdOfOwnedRun(payload.runId, deviceId);
    if (!taskId) return;
    if (await this.tasks.finish(payload.runId, payload)) await this.ended({ taskId, runId: payload.runId, deviceId });
    await this.dispatch(deviceId);
  }

  /** The agent process restarted or lost its connection, and it stops Claude when that happens. */
  async onAgentLost(deviceId: string, reason: string): Promise<void> {
    const runs = await this.tasks.failRunning(deviceId, reason);
    await Promise.all(runs.map((r) => this.ended({ ...r, deviceId })));
  }

  /** Sends the task's current summary to every dashboard. */
  async refresh(taskId: string): Promise<void> {
    this.dashboard.pushTask(await this.tasks.summary(taskId));
  }

  private async ended(event: RunEndedEvent) {
    for (const listener of this.endedListeners) {
      try {
        await listener(event);
      } catch (error) {
        this.logger.error(`run-ended listener failed for ${event.taskId}`, error);
      }
    }
    await this.refresh(event.taskId);
  }

  /** Claims and sends the next run. Returns the run it could not send, so the caller ends it outside the chain. */
  private async startNext(deviceId: string): Promise<RunEndedEvent | null> {
    if (!this.agents.isConnected(deviceId)) return null;
    const run = await this.tasks.claimNextQueued(deviceId);
    if (!run) return null;

    if (run.role && olderThan(run.agentVersion, MIN_LINE_AGENT_VERSION)) {
      await this.tasks.finish(run.id, {
        status: 'FAILED',
        failure: 'agent-outdated',
        outcome: `This PC's smart-team agent (${run.agentVersion}) is too old for production lines; update it to ${MIN_LINE_AGENT_VERSION} or newer.`,
      });
      return { taskId: run.taskId, runId: run.id, deviceId };
    }

    // Re-read the skill folders so a skill edited on the hub reaches the very next run.
    this.skills.reload();
    const { skillKeys, ...role } = run.role ?? { skillKeys: [] };
    const payload: RunStartPayload = {
      runId: run.id,
      prompt: run.prompt,
      workDir: run.workDir,
      mode: run.mode,
      // A line stage gets its member's skills; other runs get the team's by mode.
      skills: run.role ? this.skills.forKeys(skillKeys) : this.skills.forRun(run.team, run.mode),
      assets: await this.assets.forRun(run.taskId, run.team),
      ...(run.resumeSessionId ? { resumeSessionId: run.resumeSessionId } : {}),
      ...(run.role ? { role: role as RunRole } : {}),
    };
    if (!this.agents.send(deviceId, AgentEvents.runStart, payload)) {
      await this.tasks.finish(run.id, { status: 'FAILED', outcome: 'The PC disconnected before the run could start.' });
      return { taskId: run.taskId, runId: run.id, deviceId };
    }
    await this.refresh(run.taskId);
    return null;
  }
}

/** "0.3.0" is older than "0.4.0"; anything unreadable counts as old. */
export function olderThan(version: string, minimum: string): boolean {
  const parse = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10));
  const a = parse(version);
  const b = parse(minimum);
  if (a.some(Number.isNaN)) return true;
  for (let i = 0; i < b.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i]!;
    if (x !== y) return x < y;
  }
  return false;
}
