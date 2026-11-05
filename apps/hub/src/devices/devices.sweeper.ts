import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HEARTBEAT_MS } from '@smart-team/shared';
import { DashboardGateway } from './dashboard.gateway.js';
import { DevicesService } from './devices.service.js';

/** Catches agents that vanish without a clean disconnect (sleep, cable pulled). */
@Injectable()
export class DevicesSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DevicesSweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly devices: DevicesService,
    private readonly dashboard: DashboardGateway,
  ) {}

  async onModuleInit() {
    // Nobody is connected right after a hub restart; agents re-register within seconds.
    await this.devices.sweepStale(new Date(Date.now() + 365 * 24 * 3600 * 1000));
    this.timer = setInterval(() => void this.sweep(), HEARTBEAT_MS);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private async sweep() {
    try {
      if ((await this.devices.sweepStale()) > 0) await this.dashboard.pushDevices();
    } catch (error) {
      this.logger.error('sweep failed', error);
    }
  }
}
