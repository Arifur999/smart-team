import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTaskInput, TaskSummary } from '@smart-team/shared';
import { DevicesService } from '../devices/devices.service.js';
import { IntakeService } from '../intake/intake.service.js';
import { RunDispatcher } from '../orchestration/run-dispatcher.js';
import { TasksService } from './tasks.service.js';
import { isInsideFolders } from './work-dir.js';

/**
 * What you can do to a task, from the dashboard or through the command bot: start it, approve its plan,
 * send it an instruction or cancel it. Each one also tells the PCs and dashboards.
 */
@Injectable()
export class TaskActions {
  constructor(
    private readonly tasks: TasksService,
    private readonly devices: DevicesService,
    private readonly runs: RunDispatcher,
    private readonly intake: IntakeService,
  ) {}

  /** Creates the task and starts its intake; the plan only follows once you confirm the brief. */
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
    await this.tasks.approve(taskId);
    await this.runs.queued(taskId);
  }

  /** An instruction for the task's Claude session. It goes to Claude, never to a shell. */
  async instruct(taskId: string, prompt: string): Promise<void> {
    await this.tasks.followUp(taskId, prompt);
    await this.runs.queued(taskId);
  }

  async cancel(taskId: string): Promise<void> {
    // During intake there may be no run at all; the intake agent closes the brief instead.
    if ((await this.tasks.summary(taskId)).status === 'INTAKE') {
      await this.intake.dismiss(taskId);
      return;
    }
    await this.runs.cancel(taskId);
  }
}
