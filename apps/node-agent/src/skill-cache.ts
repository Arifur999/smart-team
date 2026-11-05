import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { AGENT_TOKEN_HEADER, type SkillBundle, type SkillRef } from '@smart-team/shared';

const DONE_MARKER = '.smart-team-complete';
const PLUGIN_NAME = 'smart-team-skills';

type Fetch = (url: string, init: { headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Keeps skill bundles from the hub on disk, one folder per name@version, and builds a throwaway
 * Claude Code plugin folder per run with exactly that run's skills. The project folder is never touched.
 */
export class SkillCache {
  constructor(
    private readonly hubUrl: string,
    private readonly token: string,
    private readonly root: string,
    private readonly fetchImpl: Fetch = fetch as unknown as Fetch,
  ) {}

  dirOf(ref: SkillRef): string {
    return join(this.root, 'skills', `${ref.name}@${ref.version}`);
  }

  /** Downloads the skill unless this exact version is already cached. Returns its folder. */
  async ensure(ref: SkillRef): Promise<string> {
    const dir = this.dirOf(ref);
    if (existsSync(join(dir, DONE_MARKER))) return dir;

    const url = new URL(`/api/skills/${encodeURIComponent(ref.name)}/bundle`, this.hubUrl);
    url.searchParams.set('version', ref.version);
    const res = await this.fetchImpl(url.toString(), { headers: { [AGENT_TOKEN_HEADER]: this.token } });
    if (!res.ok) throw new Error(`the hub answered ${res.status} for skill ${ref.name}`);
    const bundle = (await res.json()) as SkillBundle;

    // Write to a temporary folder first, so a half-written skill is never used.
    const tmp = `${dir}.tmp-${process.pid}-${Date.now()}`;
    rmSync(tmp, { recursive: true, force: true });
    for (const file of bundle.files) {
      const target = safeJoin(tmp, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(file.base64, 'base64'));
    }
    writeFileSync(join(tmp, DONE_MARKER), new Date().toISOString());
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dirname(dir), { recursive: true });
    renameSync(tmp, dir);
    return dir;
  }

  /** A plugin folder holding the run's skills, for `claude --plugin-dir`. Null when the run has no skills. */
  async buildPlugin(runId: string, refs: SkillRef[]): Promise<string | null> {
    if (refs.length === 0) return null;
    const plugin = this.pluginDir(runId);
    rmSync(plugin, { recursive: true, force: true });
    mkdirSync(join(plugin, '.claude-plugin'), { recursive: true });
    writeFileSync(
      join(plugin, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: PLUGIN_NAME, version: '1.0.0', description: 'Skills for this smart-team run' }, null, 2),
    );
    for (const ref of refs) {
      const source = await this.ensure(ref);
      cpSync(source, join(plugin, 'skills', ref.name), { recursive: true, filter: (src) => !src.endsWith(DONE_MARKER) });
    }
    return plugin;
  }

  removePlugin(runId: string) {
    rmSync(this.pluginDir(runId), { recursive: true, force: true });
  }

  private pluginDir(runId: string): string {
    return join(this.root, 'runs', runId.replace(/[^a-zA-Z0-9-]/g, ''));
  }
}

/** Joins a path from a bundle onto `base`, refusing anything that would land outside it. */
export function safeJoin(base: string, path: string): string {
  if (isAbsolute(path) || path.includes('\0')) throw new Error(`unsafe path in skill bundle: ${path}`);
  const target = resolve(base, path);
  const rel = relative(resolve(base), target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`unsafe path in skill bundle: ${path}`);
  return target;
}
