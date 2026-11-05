import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';

/** Which socket each online device is on, so the hub can send it work. */
@Injectable()
export class AgentRegistry {
  private server?: Namespace;
  private readonly sockets = new Map<string, string>();

  attach(server: Namespace) {
    this.server = server;
  }

  set(deviceId: string, socketId: string) {
    this.sockets.set(deviceId, socketId);
  }

  /**
   * Forgets the device only if `socketId` is still its current socket, so an old socket closing late
   * cannot knock a reconnected device offline. Returns true when the device was removed.
   */
  removeIfCurrent(deviceId: string, socketId: string): boolean {
    if (this.sockets.get(deviceId) !== socketId) return false;
    this.sockets.delete(deviceId);
    return true;
  }

  isConnected(deviceId: string): boolean {
    return this.sockets.has(deviceId);
  }

  /** Returns false when the device is not connected. */
  send(deviceId: string, event: string, payload: unknown): boolean {
    const socketId = this.sockets.get(deviceId);
    if (!socketId || !this.server) return false;
    this.server.to(socketId).emit(event, payload);
    return true;
  }
}
