import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTaskInput, TaskSummary } from '@smart-team/shared';
import { DevicesService } from '../devices/devices.service.js';
import { IntakeService } from '../intake/intake.service.js';
import { LineService } from '../line/line.service.js';
import { RunDispatcher } from '../orchestration/run-dispatcher.js';
import { TasksService } from './tasks.service.js';
import { isInsideFolders } from './work-dir.js';

/**
 * What you can do to a task, from the dashboard or through the command bot: start it, approve what waits
 * for you, send it an instruction or cancel it. Tasks on a production line go through the line; others
 * through their plan and its Claude session. Each one also tells the PCs and dashboards.
 */
@Injectable()
export class TaskActions {
  constructor(
    private readonly tasks: TasksService,
    private readonly devices: DevicesService,
    private readonly runs: RunDispatcher,
    private readonly intake: IntakeService,
    private readonly lines: LineService,
  ) {}

  /** Creates the task and starts its intake; planning (or the line) only starts once you confirm the brief. */
  async start(input: CreateTaskInput): Promise<TaskSummary> {
    const device = await this.devices.sharedFolders(input.deviceId);
    if (!device) throw new NotFoundException('Device not found');
    if (!isInsideFolders(input.workDir, device.folders, device.platform)) {
      throw new BadRequestException('The working folder must be one of the shared folders on that PC.');
    }

    const task = await this.tasks.create(input);
    await this.intake.start(task.id, input.prompt);
    await this.runs.refresh(task.id);
    return this.tasks.summary(task.id);
  }

  async approve(taskId: string): Promise<void> {
    if (await this.onLine(taskId)) return this.lines.approve(taskId);
    await this.tasks.approve(taskId);
    await this.runs.queued(taskId);
  }

  /** An instruction for the task. It goes to Claude (or, on a line, to the stage waiting for you), never to a shell. */
  async instruct(taskId: string, prompt: string): Promise<void> {
    if (await this.onLine(taskId)) return this.lines.instruct(taskId, prompt);
    await this.tasks.followUp(taskId, prompt);
    await this.runs.queued(taskId);
  }

  async cancel(taskId: string): Promise<void> {
    // During intake there may be no run at all; the intake agent closes the brief instead.
    if ((await this.tasks.summary(taskId)).status === 'INTAKE') {
      await this.intake.dismiss(taskId);
      return;
    }
    if (await this.onLine(taskId)) return this.lines.cancel(taskId);
    await this.runs.cancel(taskId);
  }

  /** True once a line task has left the intake and runs stage by stage. */
  private async onLine(taskId: string): Promise<boolean> {
    const summary = await this.tasks.summary(taskId);
    return summary.line !== null && summary.status !== 'INTAKE';
  }
}
