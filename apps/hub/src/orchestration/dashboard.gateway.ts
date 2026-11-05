import { ParseUUIDPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { DASHBOARD_NAMESPACE, DashboardEvents, type BotMessageView, type TaskLogEvent, type TaskSummary } from '@smart-team/shared';
import type { Namespace, Socket } from 'socket.io';
import { DevicesService } from '../devices/devices.service.js';
import { getEnv } from '../env.js';

const taskRoom = (taskId: string) => `task:${taskId}`;

// No login yet: the hub only listens on the LAN. Dashboard auth comes before the command bot.
@WebSocketGateway({ namespace: DASHBOARD_NAMESPACE, cors: { origin: getEnv().DASHBOARD_ORIGIN } })
export class DashboardGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Namespace;

  constructor(private readonly devices: DevicesService) {}

  async handleConnection(client: Socket) {
    client.emit(DashboardEvents.devices, await this.devices.list());
  }

  /** A page opened after the socket connected asks for the current list. */
  @SubscribeMessage(DashboardEvents.devices)
  async sendDevices(@ConnectedSocket() client: Socket) {
    client.emit(DashboardEvents.devices, await this.devices.list());
  }

  /** Live log lines are only sent to dashboards that have the task open. */
  @SubscribeMessage(DashboardEvents.watchTask)
  async watch(@ConnectedSocket() client: Socket, @MessageBody(new ParseUUIDPipe()) taskId: string) {
    await client.join(taskRoom(taskId));
  }

  @SubscribeMessage(DashboardEvents.unwatchTask)
  async unwatch(@ConnectedSocket() client: Socket, @MessageBody(new ParseUUIDPipe()) taskId: string) {
    await client.leave(taskRoom(taskId));
  }

  async pushDevices() {
    this.server.emit(DashboardEvents.devices, await this.devices.list());
  }

  pushTask(task: TaskSummary) {
    this.server.emit(DashboardEvents.taskUpdated, task);
  }

  pushLogs(event: TaskLogEvent) {
    this.server.to(taskRoom(event.taskId)).emit(DashboardEvents.taskLog, event);
  }

  /** New or changed bot messages, so every open dashboard shows the same chat. */
  pushBotMessage(message: BotMessageView) {
    this.server.emit(DashboardEvents.botMessage, message);
  }
}
