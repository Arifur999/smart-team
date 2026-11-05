import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module.js';
import { AgentStatsController } from '../tasks/agent-stats.controller.js';
import { TasksController } from '../tasks/tasks.controller.js';
import { TasksService } from '../tasks/tasks.service.js';
import { AgentRegistry } from './agent-registry.js';
import { AgentsGateway } from './agents.gateway.js';
import { DashboardGateway } from './dashboard.gateway.js';
import { DevicesSweeper } from './devices.sweeper.js';
import { RunDispatcher } from './run-dispatcher.js';

/**
 * Everything live: agent and dashboard sockets, and the tasks that flow between them.
 * Kept in one module because these pieces call each other both ways.
 */
@Module({
  imports: [DevicesModule],
  controllers: [TasksController, AgentStatsController],
  providers: [TasksService, AgentRegistry, DashboardGateway, AgentsGateway, DevicesSweeper, RunDispatcher],
})
export class OrchestrationModule {}
