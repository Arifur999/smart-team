import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { AGENT_NAMESPACE, AgentEvents } from '@smart-team/shared';
import type { Socket } from 'socket.io';
import { getEnv } from '../env.js';
import { DashboardGateway } from './dashboard.gateway.js';
import { DevicesService } from './devices.service.js';
import { RegisterDeviceDto } from './dto/register-device.dto.js';
import { normalizeIp, tokensMatch } from './socket-auth.js';

const wsValidation = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new WsException(errors.map((e) => e.toString()).join('; ')),
});

@WebSocketGateway({ namespace: AGENT_NAMESPACE })
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AgentsGateway.name);
  /** deviceId -> socket id of its current connection, so a stale socket closing late cannot mark a live device offline. */
  private readonly liveSockets = new Map<string, string>();

  constructor(
    private readonly devices: DevicesService,
    private readonly dashboard: DashboardGateway,
  ) {}

  handleConnection(client: Socket) {
    if (!tokensMatch(client.handshake.auth?.token, getEnv().AGENT_TOKEN)) {
      this.logger.warn(`rejected agent from ${client.handshake.address}: bad token`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const deviceId = client.data.deviceId as string | undefined;
    if (!deviceId || this.liveSockets.get(deviceId) !== client.id) return;

    this.liveSockets.delete(deviceId);
    await this.devices.markOffline(deviceId);
    await this.dashboard.pushDevices();
  }

  @UsePipes(wsValidation)
  @SubscribeMessage(AgentEvents.register)
  async register(@ConnectedSocket() client: Socket, @MessageBody() body: RegisterDeviceDto) {
    const deviceId = await this.devices.register(body, normalizeIp(client.handshake.address));
    client.data.deviceId = deviceId;
    this.liveSockets.set(deviceId, client.id);
    this.logger.log(`${body.name} registered with ${body.resources.length} resources`);
    await this.dashboard.pushDevices();
    return { deviceId };
  }

  @SubscribeMessage(AgentEvents.heartbeat)
  async heartbeat(@ConnectedSocket() client: Socket) {
    const deviceId = client.data.deviceId as string | undefined;
    if (!deviceId) return;
    if (await this.devices.heartbeat(deviceId)) await this.dashboard.pushDevices();
  }
}
