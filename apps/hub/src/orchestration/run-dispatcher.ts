import { Injectable, Logger } from '@nestjs/common';
import { AgentEvents, type RunCancelPayload, type RunFinishedPayload, type RunLogPayload, type RunStartPayload } from '@smart-team/shared';
import { TasksService } from '../tasks/tasks.service.js';
import { AgentRegistry } from './agent-registry.js';
import { DashboardGateway } from './dashboard.gateway.js';

/** Moves runs between the database, the agents and the dashboard. */
@Injectable()
export class RunDispatcher {
  private readonly logger = new Logger(RunDispatcher.name);
  /** Per-device promise chain, so two triggers at once cannot start two runs on one PC. */
  private readonly queues = new Map<string, Promise<void>>();

  constructor(
    private readonly tasks: TasksService,
    private readonly agents: AgentRegistry,
    private readonly dashboard: DashboardGateway,
  ) {}

  /** Starts the device's next queued run if it is online and idle. Safe to call any time. */
  dispatch(deviceId: string): Promise<void> {
    const previous = this.queues.get(deviceId) ?? Promise.resolve();
    const next = previous
      .then(() => this.startNext(deviceId))
      .catch((error) => this.logger.error(`dispatch to ${deviceId} failed`, error));
    this.queues.set(deviceId, next);
    return next;
  }

  /** Call after a run was added to a task: tells dashboards, then starts it if the PC is free. */
  async queued(taskId: string): Promise<void> {
    const run = await this.tasks.newestRun(taskId);
    await this.pushTask(taskId);
    await this.dispatch(run.deviceId);
  }

  async cancel(taskId: string): Promise<void> {
    const run = await this.tasks.newestRun(taskId);
    if (run.status === 'QUEUED' || (run.status === 'RUNNING' && !this.agents.isConnected(run.deviceId))) {
      await this.tasks.finish(run.id, { status: 'CANCELLED', outcome: 'Cancelled before it finished.' });
      await this.pushTask(taskId);
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
    if (await this.tasks.finish(payload.runId, payload)) await this.pushTask(taskId);
    await this.dispatch(deviceId);
  }

  /** The agent process restarted or lost its connection, and it stops Claude when that happens. */
  async onAgentLost(deviceId: string, reason: string): Promise<void> {
    const taskIds = await this.tasks.failRunning(deviceId, reason);
    await Promise.all(taskIds.map((id) => this.pushTask(id)));
  }

  private async startNext(deviceId: string) {
    if (!this.agents.isConnected(deviceId)) return;
    const run = await this.tasks.claimNextQueued(deviceId);
    if (!run) return;

    const payload: RunStartPayload = {
      runId: run.id,
      prompt: run.prompt,
      workDir: run.workDir,
      mode: run.mode,
      ...(run.resumeSessionId ? { resumeSessionId: run.resumeSessionId } : {}),
    };
    if (!this.agents.send(deviceId, AgentEvents.runStart, payload)) {
      await this.tasks.finish(run.id, { status: 'FAILED', outcome: 'The PC disconnected before the run could start.' });
    }
    await this.pushTask(run.taskId);
  }

  private async pushTask(taskId: string) {
    this.dashboard.pushTask(await this.tasks.summary(taskId));
  }
}
