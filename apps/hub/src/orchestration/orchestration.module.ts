import { Module } from '@nestjs/common';
import { BotController } from '../bot/bot.controller.js';
import { BotService } from '../bot/bot.service.js';
import { AgentDeliverablesController, DeliverablesController } from '../deliverables/deliverables.controller.js';
import { DeliverablesService } from '../deliverables/deliverables.service.js';
import { DevicesModule } from '../devices/devices.module.js';
import { AssetsController } from '../intake/assets.controller.js';
import { AssetsService } from '../intake/assets.service.js';
import { IntakeController } from '../intake/intake.controller.js';
import { IntakeService } from '../intake/intake.service.js';
import { LineController, LinesController } from '../line/line.controller.js';
import { LineService } from '../line/line.service.js';
import { SkillsModule } from '../skills/skills.module.js';
import { AgentStatsController } from '../tasks/agent-stats.controller.js';
import { TaskActions } from '../tasks/task-actions.js';
import { TasksController } from '../tasks/tasks.controller.js';
import { TasksService } from '../tasks/tasks.service.js';
import { AgentRegistry } from './agent-registry.js';
import { AgentsGateway } from './agents.gateway.js';
import { DashboardGateway } from './dashboard.gateway.js';
import { DevicesSweeper } from './devices.sweeper.js';
import { RunDispatcher } from './run-dispatcher.js';

/**
 * Everything live: agent and dashboard sockets, tasks, the intake, the command bot, and the runs that flow
 * between them. Kept in one module because these pieces call each other both ways.
 */
@Module({
  imports: [DevicesModule, SkillsModule],
  controllers: [
    TasksController,
    AgentStatsController,
    IntakeController,
    AssetsController,
    BotController,
    LineController,
    LinesController,
    AgentDeliverablesController,
    DeliverablesController,
  ],
  providers: [
    DeliverablesService,
    TasksService,
    TaskActions,
    AssetsService,
    IntakeService,
    BotService,
    AgentRegistry,
    DashboardGateway,
    AgentsGateway,
    DevicesSweeper,
    RunDispatcher,
    LineService,
  ],
})
export class OrchestrationModule {}
