import { Injectable } from '@nestjs/common';
import { OFFLINE_AFTER_MS, type DeviceView, type RegisterPayload } from '@smart-team/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DEVICE_SELECT = {
  id: true,
  name: true,
  hostname: true,
  ip: true,
  platform: true,
  agentVersion: true,
  status: true,
  lastSeenAt: true,
  resources: {
    select: { kind: true, name: true, path: true, version: true, tags: true },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  },
} satisfies Prisma.DeviceSelect;

type DeviceRow = Prisma.DeviceGetPayload<{ select: typeof DEVICE_SELECT }>;

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upserts the device by name and replaces its resource list. Returns the device id. */
  async register(payload: RegisterPayload, ip: string | null, now = new Date()): Promise<string> {
    const fields = {
      hostname: payload.hostname,
      ip,
      platform: payload.platform,
      agentVersion: payload.agentVersion,
      status: 'ONLINE' as const,
      lastSeenAt: now,
    };

    return this.prisma.$transaction(async (tx) => {
      const device = await tx.device.upsert({
        where: { name: payload.name },
        create: { name: payload.name, ...fields },
        update: fields,
        select: { id: true },
      });

      await tx.resource.deleteMany({ where: { deviceId: device.id } });
      if (payload.resources.length > 0) {
        await tx.resource.createMany({
          data: payload.resources.map((r) => ({
            deviceId: device.id,
            kind: r.kind,
            name: r.name,
            path: r.path ?? null,
            version: r.version ?? null,
            tags: r.tags,
          })),
        });
      }
      return device.id;
    });
  }

  /** Refreshes lastSeenAt. Returns true when the device came back from OFFLINE. */
  async heartbeat(deviceId: string, now = new Date()): Promise<boolean> {
    const revived = await this.prisma.device.updateMany({
      where: { id: deviceId, status: 'OFFLINE' },
      data: { status: 'ONLINE', lastSeenAt: now },
    });
    if (revived.count > 0) return true;

    await this.prisma.device.updateMany({ where: { id: deviceId }, data: { lastSeenAt: now } });
    return false;
  }

  async markOffline(deviceId: string): Promise<void> {
    await this.prisma.device.updateMany({ where: { id: deviceId }, data: { status: 'OFFLINE' } });
  }

  /** Marks devices that stopped beating as OFFLINE. Returns how many changed. */
  async sweepStale(now = new Date()): Promise<number> {
    const { count } = await this.prisma.device.updateMany({
      where: { status: 'ONLINE', lastSeenAt: { lt: new Date(now.getTime() - OFFLINE_AFTER_MS) } },
      data: { status: 'OFFLINE' },
    });
    return count;
  }

  async list(): Promise<DeviceView[]> {
    const rows = await this.prisma.device.findMany({
      select: DEVICE_SELECT,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toView);
  }
}

function toView(row: DeviceRow): DeviceView {
  return {
    ...row,
    lastSeenAt: row.lastSeenAt.toISOString(),
    resources: row.resources.map((r) => ({
      kind: r.kind,
      name: r.name,
      tags: r.tags,
      ...(r.path ? { path: r.path } : {}),
      ...(r.version ? { version: r.version } : {}),
    })),
  };
}
