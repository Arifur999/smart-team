import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { INTAKE_TEMPLATES, type AssetView, type RunAsset, type TeamId } from '@smart-team/shared';
import { DevicesService } from '../devices/devices.service.js';
import { getEnv } from '../env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isInsideFolders } from '../tasks/work-dir.js';

const ASSET_SELECT = {
  id: true,
  fieldId: true,
  kind: true,
  name: true,
  tag: true,
  path: true,
  deviceId: true,
  url: true,
  size: true,
  device: { select: { name: true } },
} satisfies Prisma.AssetSelect;

type AssetRow = Prisma.AssetGetPayload<{ select: typeof ASSET_SELECT }>;

/** A file multer already wrote into UPLOAD_DIR. */
export interface StoredUpload {
  filename: string;
  originalname: string;
  size: number;
  mimetype: string;
}

/** Files given for a brief: uploads kept on the hub, folders on a PC, and links. */
@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
  ) {}

  async list(taskId: string): Promise<AssetView[]> {
    const rows = await this.prisma.asset.findMany({ where: { taskId }, select: ASSET_SELECT, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    return rows.map(toView);
  }

  /** What a run gets: every asset with the label of the field it answers. */
  async forRun(taskId: string, team: TeamId): Promise<RunAsset[]> {
    const labels = new Map(INTAKE_TEMPLATES[team].map((f) => [f.id, f.label]));
    return (await this.list(taskId)).map((a) => ({
      id: a.id,
      kind: a.kind,
      name: a.name,
      tag: a.tag,
      fieldLabel: labels.get(a.fieldId) ?? a.fieldId,
      path: a.path,
      deviceId: a.deviceId,
      deviceName: a.deviceName,
      url: a.url,
    }));
  }

  async addUpload(taskId: string, fieldId: string, tag: string | null, file: StoredUpload): Promise<AssetView> {
    const row = await this.prisma.asset.create({
      data: { taskId, fieldId, kind: 'UPLOAD', name: file.originalname, tag, storageKey: file.filename, size: file.size, mime: file.mimetype },
      select: ASSET_SELECT,
    });
    return toView(row);
  }

  /** A file or folder on one of the PCs. It must sit in a folder that PC shares, like a working folder. */
  async addPath(taskId: string, fieldId: string, tag: string | null, deviceId: string, path: string): Promise<AssetView> {
    const device = await this.devices.sharedFolders(deviceId);
    if (!device) throw new NotFoundException('Device not found');
    if (!isInsideFolders(path, device.folders, device.platform)) {
      throw new BadRequestException('That path is not inside a folder this PC shares. Add the folder to its agent.config.json first.');
    }
    const name = path.split(/[\\/]/).filter(Boolean).pop() ?? path;
    const row = await this.prisma.asset.create({ data: { taskId, fieldId, kind: 'PATH', name, tag, path, deviceId }, select: ASSET_SELECT });
    return toView(row);
  }

  async addLink(taskId: string, fieldId: string, tag: string | null, url: string): Promise<AssetView> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('That is not a valid link.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new BadRequestException('Only http and https links are accepted.');
    const row = await this.prisma.asset.create({
      data: { taskId, fieldId, kind: 'LINK', name: parsed.hostname + parsed.pathname, tag, url: parsed.toString() },
      select: ASSET_SELECT,
    });
    return toView(row);
  }

  async remove(taskId: string, assetId: string): Promise<void> {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, taskId }, select: { storageKey: true } });
    if (!asset) throw new NotFoundException('File not found');
    await this.prisma.asset.delete({ where: { id: assetId } });
    if (asset.storageKey) rmSync(join(getEnv().UPLOAD_DIR, asset.storageKey), { force: true });
  }

  /** Where an uploaded file lives on the hub, for agents to download. */
  async uploadFile(assetId: string): Promise<{ path: string; name: string; size: number; mime: string | null }> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, kind: 'UPLOAD' },
      select: { storageKey: true, name: true, size: true, mime: true },
    });
    const path = asset?.storageKey ? join(getEnv().UPLOAD_DIR, asset.storageKey) : null;
    if (!asset || !path || !existsSync(path)) throw new NotFoundException('File not found');
    return { path, name: asset.name, size: Number(asset.size ?? 0), mime: asset.mime };
  }
}

function toView(a: AssetRow): AssetView {
  return {
    id: a.id,
    fieldId: a.fieldId,
    kind: a.kind,
    name: a.name,
    tag: a.tag,
    path: a.path,
    deviceId: a.deviceId,
    deviceName: a.device?.name ?? null,
    url: a.url,
    size: a.size === null ? null : Number(a.size),
  };
}
