import { Module } from '@nestjs/common';
import { AgentsGateway } from './agents.gateway.js';
import { DashboardGateway } from './dashboard.gateway.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { DevicesSweeper } from './devices.sweeper.js';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DashboardGateway, AgentsGateway, DevicesSweeper],
  exports: [DevicesService],
})
export class DevicesModule {}
