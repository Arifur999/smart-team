import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { DASHBOARD_NAMESPACE, DashboardEvents } from '@smart-team/shared';
import type { Namespace, Socket } from 'socket.io';
import { getEnv } from '../env.js';
import { DevicesService } from './devices.service.js';

// Phase 1: no login. The hub only listens on the LAN; dashboard auth comes with tasks.
@WebSocketGateway({ namespace: DASHBOARD_NAMESPACE, cors: { origin: getEnv().DASHBOARD_ORIGIN } })
export class DashboardGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Namespace;

  constructor(private readonly devices: DevicesService) {}

  async handleConnection(client: Socket) {
    client.emit(DashboardEvents.devices, await this.devices.list());
  }

  async pushDevices() {
    this.server.emit(DashboardEvents.devices, await this.devices.list());
  }
}
