import { Controller, Get } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

/** Per-member time, tokens and cost for the office view. */
@Controller('agents')
export class AgentStatsController {
  constructor(private readonly tasks: TasksService) {}

  @Get('stats')
  stats() {
    return this.tasks.agentStats();
  }
}
