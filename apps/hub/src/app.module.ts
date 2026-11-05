import { Module } from '@nestjs/common';
import { DevicesModule } from './devices/devices.module.js';
import { OrchestrationModule } from './orchestration/orchestration.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, DevicesModule, OrchestrationModule],
})
export class AppModule {}
