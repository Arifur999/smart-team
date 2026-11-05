import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { AGENT_NAMESPACE, AgentEvents } from '@smart-team/shared';
import type { Namespace, Socket } from 'socket.io';
import { DevicesService } from '../devices/devices.service.js';
import { RegisterDeviceDto } from '../devices/dto/register-device.dto.js';
import { getEnv } from '../env.js';
import { RunFinishedDto, RunLogDto } from '../tasks/dto/run-events.dto.js';
import { AgentRegistry } from './agent-registry.js';
import { DashboardGateway } from './dashboard.gateway.js';
import { RunDispatcher } from './run-dispatcher.js';
import { normalizeIp, tokensMatch } from './socket-auth.js';

const wsValidation = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new WsException(errors.map((e) => e.toString()).join('; ')),
});

@UsePipes(wsValidation)
@WebSocketGateway({ namespace: AGENT_NAMESPACE })
export class AgentsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AgentsGateway.name);

  constructor(
    private readonly devices: DevicesService,
    private readonly dashboard: DashboardGateway,
    private readonly agents: AgentRegistry,
    private readonly runs: RunDispatcher,
  ) {}

  afterInit(server: Namespace) {
    this.agents.attach(server);
  }

  handleConnection(client: Socket) {
    if (!tokensMatch(client.handshake.auth?.token, getEnv().AGENT_TOKEN)) {
      this.logger.warn(`Rejected agent from ${client.handshake.address}: bad token`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const deviceId = deviceOf(client);
    if (!deviceId || !this.agents.removeIfCurrent(deviceId, client.id)) return;

    await this.devices.markOffline(deviceId);
    await this.dashboard.pushDevices();
    await this.runs.onAgentLost(deviceId, 'Lost the connection to the PC while the run was going.');
  }

  @SubscribeMessage(AgentEvents.register)
  async register(@ConnectedSocket() client: Socket, @MessageBody() body: RegisterDeviceDto) {
    const deviceId = await this.devices.register(body, normalizeIp(client.handshake.address));
    client.data.deviceId = deviceId;
    this.agents.set(deviceId, client.id);
    this.logger.log(`${body.name} registered with ${body.resources.length} resources`);

    // A freshly started agent has no runs, so anything still marked running was cut off.
    await this.runs.onAgentLost(deviceId, 'The agent on the PC restarted while the run was going.');
    await this.dashboard.pushDevices();
    await this.runs.dispatch(deviceId);
    return { deviceId };
  }

  @SubscribeMessage(AgentEvents.heartbeat)
  async heartbeat(@ConnectedSocket() client: Socket) {
    const deviceId = deviceOf(client);
    if (!deviceId) return;
    if (await this.devices.heartbeat(deviceId)) await this.dashboard.pushDevices();
  }

  @SubscribeMessage(AgentEvents.runLog)
  async runLog(@ConnectedSocket() client: Socket, @MessageBody() body: RunLogDto) {
    const deviceId = deviceOf(client);
    if (deviceId) await this.runs.onLogs(deviceId, body);
  }

  @SubscribeMessage(AgentEvents.runFinished)
  async runFinished(@ConnectedSocket() client: Socket, @MessageBody() body: RunFinishedDto) {
    const deviceId = deviceOf(client);
    if (deviceId) await this.runs.onFinished(deviceId, body);
  }
}

function deviceOf(client: Socket): string | undefined {
  return client.data.deviceId as string | undefined;
}
