import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { FollowUpDto } from './dto/follow-up.dto.js';
import { TaskActions } from './task-actions.js';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly actions: TaskActions,
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
  create(@Body() body: CreateTaskDto) {
    return this.actions.start(body);
  }

  @Post(':id/approve')
  @HttpCode(202)
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    await this.actions.approve(id);
  }

  /** A line typed into the task's terminal. It goes to Claude, never to a shell. */
  @Post(':id/messages')
  @HttpCode(202)
  async followUp(@Param('id', ParseUUIDPipe) id: string, @Body() body: FollowUpDto) {
    await this.actions.instruct(id, body.prompt);
  }

  @Post(':id/cancel')
  @HttpCode(202)
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    await this.actions.cancel(id);
  }
}
