import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AGENT_TOKEN_HEADER, type RunAsset, type RunMode } from '@smart-team/shared';
import { resolveAllowedDir } from './folder-guard.js';

export interface PreparedAssets {
  /** Folders Claude may read, passed with --add-dir. */
  addDirs: string[];
  /** A section appended to the prompt that tells Claude where each file is. */
  promptSuffix: string;
}

type Fetch = (url: string, init: { headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; body: ReadableStream | null }>;

/**
 * Makes a brief's files usable on this PC: uploads are downloaded once into the cache, folders that live
 * on this PC are opened to Claude directly, and everything else is listed so Claude knows it exists.
 */
export class AssetCache {
  constructor(
    private readonly hubUrl: string,
    private readonly token: string,
    private readonly root: string,
    private readonly deviceId: () => string | null,
    private readonly sharedFolders: () => string[],
    private readonly fetchImpl: Fetch = fetch as unknown as Fetch,
  ) {}

  async prepare(assets: RunAsset[], mode: RunMode): Promise<PreparedAssets> {
    if (assets.length === 0) return { addDirs: [], promptSuffix: '' };
    const addDirs = new Set<string>();
    const lines: string[] = [];
    const here = this.deviceId();

    for (const asset of assets) {
      const label = `${asset.fieldLabel}${asset.tag ? ` [${asset.tag}]` : ''}`;
      if (asset.kind === 'LINK') {
        lines.push(`- ${label}: link ${asset.url}`);
      } else if (asset.kind === 'UPLOAD') {
        // The brief check only needs to know the file exists; big footage is not worth downloading for it.
        if (mode === 'INTAKE') {
          lines.push(`- ${label}: uploaded file ${asset.name}`);
          continue;
        }
        const path = await this.download(asset);
        addDirs.add(dirname(path));
        lines.push(`- ${label}: ${path}`);
      } else if (asset.deviceId && asset.deviceId === here && asset.path) {
        const local = resolveAllowedDir(asset.path, this.sharedFolders()) ?? resolveAllowedFile(asset.path, this.sharedFolders());
        if (local) {
          addDirs.add(isDirectory(local) ? local : dirname(local));
          lines.push(`- ${label}: ${local}`);
        } else {
          lines.push(`- ${label}: ${asset.path} on this PC, but it is missing or not in a shared folder`);
        }
      } else {
        lines.push(`- ${label}: ${asset.path} on PC ${asset.deviceName ?? 'unknown'} (not reachable from this PC yet)`);
      }
    }

    return { addDirs: [...addDirs], promptSuffix: ['', '## Files from the brief', ...lines].join('\n') };
  }

  /** Downloads an upload unless it is already cached. Returns the local file path. */
  private async download(asset: RunAsset): Promise<string> {
    const target = join(this.root, 'assets', asset.id, safeFileName(asset.name));
    if (existsSync(target)) return target;

    const res = await this.fetchImpl(new URL(`/api/assets/${asset.id}/file`, this.hubUrl).toString(), {
      headers: { [AGENT_TOKEN_HEADER]: this.token },
    });
    if (!res.ok || !res.body) throw new Error(`the hub answered ${res.status} for ${asset.name}`);

    mkdirSync(dirname(target), { recursive: true });
    const partial = `${target}.part`;
    try {
      await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(partial));
      renameSync(partial, target);
    } catch (error) {
      rmSync(partial, { force: true });
      throw error;
    }
    return target;
  }
}

/** Keeps the uploaded name readable but safe as a single file name on any OS. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^\.+/, '_').trim();
  return cleaned.slice(0, 180) || 'file';
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Like resolveAllowedDir, but for a single file inside a shared folder. */
function resolveAllowedFile(path: string, folders: string[]): string | null {
  const parent = resolveAllowedDir(dirname(path), folders);
  return parent && existsSync(path) ? path : null;
}
