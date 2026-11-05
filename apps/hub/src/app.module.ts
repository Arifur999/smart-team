import { Module } from '@nestjs/common';
import { DevicesModule } from './devices/devices.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, DevicesModule],
})
export class AppModule {}
