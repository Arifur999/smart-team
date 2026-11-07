import { existsSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  matchGlob,
  normalizeTaskPath,
  type DeliverableSpec,
  type DeliverableView,
  type FixNote,
  type RunRole,
  type Verdict,
  type VersionsView,
  type VersionView,
} from '@smart-team/shared';
import { getEnv } from '../env.js';
import { Prisma, type DeliverableKind } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoredUpload } from '../intake/assets.service.js';

/** Most files one run may upload. */
const MAX_FILES_PER_RUN = 60;

/** Content types by extension. The browser never decides what a file is. */
const TYPES: Record<string, { mime: string; kind: DeliverableKind; inline: boolean }> = {
  '.mp4': { mime: 'video/mp4', kind: 'VIDEO', inline: true },
  '.webm': { mime: 'video/webm', kind: 'VIDEO', inline: true },
  '.mov': { mime: 'video/quicktime', kind: 'VIDEO', inline: true },
  '.png': { mime: 'image/png', kind: 'IMAGE', inline: true },
  '.jpg': { mime: 'image/jpeg', kind: 'IMAGE', inline: true },
  '.jpeg': { mime: 'image/jpeg', kind: 'IMAGE', inline: true },
  '.webp': { mime: 'image/webp', kind: 'IMAGE', inline: true },
  '.gif': { mime: 'image/gif', kind: 'IMAGE', inline: true },
  // SVG can carry scripts: only ever downloaded.
  '.svg': { mime: 'image/svg+xml', kind: 'IMAGE', inline: false },
  '.wav': { mime: 'audio/wav', kind: 'AUDIO', inline: true },
  '.mp3': { mime: 'audio/mpeg', kind: 'AUDIO', inline: true },
  '.m4a': { mime: 'audio/mp4', kind: 'AUDIO', inline: true },
  '.json': { mime: 'application/json', kind: 'TEXT', inline: true },
  '.md': { mime: 'text/markdown; charset=utf-8', kind: 'TEXT', inline: true },
  '.txt': { mime: 'text/plain; charset=utf-8', kind: 'TEXT', inline: true },
};
const OTHER = { mime: 'application/octet-stream', kind: 'OTHER' as const, inline: false };

export function fileType(path: string) {
  return TYPES[extname(path).toLowerCase()] ?? OTHER;
}

/** The version a path belongs to, from its "v<n>" folder or file name (04-renders/v2/…, critique/v2.json). */
export function versionOf(path: string): number | null {
  const m = path.match(/(?:^|\/)v(\d+)(?:\/|\.json$)/);
  return m ? Number(m[1]) : null;
}

/** Files stages upload for the Review Booth: renders, style frames, comparison sheets, the reference copy. */
@Injectable()
export class DeliverablesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores a file an agent uploaded for a running line stage. Only the PC running the stage may send it,
   * only into paths the stage declared, and the same path again becomes the next version.
   */
  async addFromAgent(runId: string, deviceId: string | undefined, path: string, label: string | undefined, file: StoredUpload): Promise<DeliverableView> {
    const discard = () => rmSync(join(getEnv().DELIVERABLES_DIR, file.filename), { force: true });
    try {
      const run = await this.prisma.run.findUnique({ where: { id: runId }, select: { id: true, taskId: true, deviceId: true, status: true, stepId: true, stage: true, role: true } });
      if (!run || !run.stepId || !run.stage) throw new NotFoundException('Run not found');
      if (!deviceId || run.deviceId !== deviceId) throw new ForbiddenException('Only the PC running this stage may upload its files.');
      if (run.status !== 'RUNNING') throw new ConflictException('This run is not going any more.');
      const rel = normalizeTaskPath(path);
      const specs = ((run.role as unknown as RunRole | null)?.deliverables ?? []) as DeliverableSpec[];
      if (!rel || !specs.some((s) => matchGlob(s.glob, rel, true))) throw new ForbiddenException(`${path} is not one of this stage's files.`);
      if ((await this.prisma.deliverable.count({ where: { runId } })) >= MAX_FILES_PER_RUN) throw new ConflictException('This run uploaded enough files.');

      const type = fileType(rel);
      for (let tries = 0; ; tries++) {
        try {
          return await this.prisma.$transaction(async (tx) => {
            const last = await tx.deliverable.findFirst({ where: { taskId: run.taskId, path: rel }, orderBy: { version: 'desc' }, select: { version: true } });
            const row = await tx.deliverable.create({
              data: {
                taskId: run.taskId,
                stepId: run.stepId,
                runId: run.id,
                stage: run.stage!,
                path: rel,
                version: (last?.version ?? 0) + 1,
                kind: type.kind,
                label: label?.slice(0, 120) ?? null,
                storageKey: file.filename,
                size: BigInt(file.size),
                mime: type.mime,
              },
            });
            return toView(row);
          });
        } catch (error) {
          // Two uploads of the same path at once: take the next version and try again.
          if (tries < 3 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
          throw error;
        }
      }
    } catch (error) {
      discard();
      throw error;
    }
  }

  /** A stored file for the browser, with how to show it. */
  async file(id: string): Promise<{ path: string; name: string; mime: string; inline: boolean }> {
    const row = await this.prisma.deliverable.findUnique({ where: { id }, select: { storageKey: true, path: true } });
    if (!row) throw new NotFoundException('File not found');
    const path = join(getEnv().DELIVERABLES_DIR, row.storageKey);
    if (!existsSync(path)) throw new NotFoundException('The file is no longer on the hub.');
    const type = fileType(row.path);
    return { path, name: row.path.split('/').at(-1) ?? 'file', mime: type.mime, inline: type.inline };
  }

  /** Everything a task's stages uploaded, grouped into render versions with the gates' judgements of each. */
  async versions(taskId: string): Promise<VersionsView> {
    const [rows, steps] = await Promise.all([
      this.prisma.deliverable.findMany({ where: { taskId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.lineStep.findMany({
        where: { taskId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { stage: true, kind: true, status: true, ownerId: true, round: true, score: true, result: true, finishedAt: true },
      }),
    ]);
    const views = rows.map(toView);
    const versions = new Map<number, VersionView>();
    const ensure = (n: number) => versions.get(n) ?? versions.set(n, { n, files: [], verdicts: [] }).get(n)!;

    for (const d of views) {
      if (d.stage === 'source' || d.stage === 'storyboard') continue;
      const n = versionOf(d.path);
      if (n !== null) ensure(n).files.push(d);
    }
    // A gate judged the render version that existed when it ran: count the animate rounds before it.
    let v = 0;
    for (const s of steps) {
      if (s.stage === 'animate' && s.status !== 'SKIPPED') v++;
      if (s.kind !== 'GATE' || !s.result || s.stage === 'storyboard-check' || v === 0) continue;
      const verdict = s.result as unknown as Verdict;
      ensure(v).verdicts.push({
        stage: s.stage,
        ownerId: s.ownerId,
        round: s.round,
        score: s.score ?? verdict.score ?? null,
        pass: Boolean(verdict.pass),
        summary: verdict.summary ?? '',
        fixes: (verdict.fixes ?? []) as FixNote[],
        at: (s.finishedAt ?? new Date()).toISOString(),
      });
    }

    return {
      taskId,
      versions: [...versions.values()].sort((a, b) => a.n - b.n),
      references: views.filter((d) => d.stage === 'source'),
      styleFrames: views.filter((d) => d.stage === 'storyboard').reverse(),
    };
  }
}

function toView(row: {
  id: string;
  stage: string;
  path: string;
  version: number;
  kind: DeliverableKind;
  label: string | null;
  size: bigint;
  mime: string;
  createdAt: Date;
}): DeliverableView {
  return {
    id: row.id,
    stage: row.stage,
    path: row.path,
    version: row.version,
    kind: row.kind,
    label: row.label,
    size: Number(row.size),
    mime: row.mime,
    createdAt: row.createdAt.toISOString(),
    url: `/api/deliverables/${row.id}/file`,
  };
}
