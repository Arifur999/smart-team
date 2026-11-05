import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service.js';
import { IntakeService } from '../intake/intake.service.js';
import { RunDispatcher } from '../orchestration/run-dispatcher.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { FollowUpDto } from './dto/follow-up.dto.js';
import { TasksService } from './tasks.service.js';
import { isInsideFolders } from './work-dir.js';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly devices: DevicesService,
    private readonly runs: RunDispatcher,
    private readonly intake: IntakeService,
  ) {}

  @Get()
  list() {
    return this.tasks.list();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.detail(id);
  }

  /** Creates the task and starts its intake; the plan only follows once you confirm the brief. */
  @Post()
  async create(@Body() body: CreateTaskDto) {
    const device = await this.devices.sharedFolders(body.deviceId);
    if (!device) throw new NotFoundException('Device not found');
    if (!isInsideFolders(body.workDir, device.folders, device.platform)) {
      throw new BadRequestException('The working folder must be one of the shared folders on that PC.');
    }

    const task = await this.tasks.create(body);
    await this.intake.start(task.id, body.prompt);
    await this.runs.refresh(task.id);
    return this.tasks.summary(task.id);
  }

  @Post(':id/approve')
  @HttpCode(202)
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    await this.tasks.approve(id);
    await this.runs.queued(id);
  }

  /** A line typed into the task's terminal. It goes to Claude, never to a shell. */
  @Post(':id/messages')
  @HttpCode(202)
  async followUp(@Param('id', ParseUUIDPipe) id: string, @Body() body: FollowUpDto) {
    await this.tasks.followUp(id, body.prompt);
    await this.runs.queued(id);
  }

  @Post(':id/cancel')
  @HttpCode(202)
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    // During intake there may be no run at all; the intake agent closes the brief instead.
    if ((await this.tasks.summary(id)).status === 'INTAKE') return this.intake.dismiss(id);
    await this.runs.cancel(id);
  }
}
