import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { matchGlob, normalizeTaskPath, type RunRole } from '@smart-team/shared';
import { resolveAllowedDir } from './folder-guard.js';

/** Folders never searched for stage files: tools' own caches and installs. */
const SKIP_DIRS = new Set(['node_modules', '.git', '.cache', '.hyperframes', '__pycache__', '.next']);
const MAX_LISTED = 20_000;
const caseless = process.platform === 'win32';

/**
 * Makes the task's folder inside the run's work folder (which must be shared), the stage's own folders, and
 * the files the hub sends (the brief). Returns the folder Claude works in, or why it cannot.
 */
export function prepareTaskFolder(workDir: string, role: RunRole, sharedFolders: string[]): { dir: string } | { error: string } {
  const base = resolveAllowedDir(workDir, sharedFolders);
  if (!base) return { error: `The folder ${workDir} is not shared on this PC, or does not exist.` };
  const folder = normalizeTaskPath(role.taskFolder);
  if (!folder) return { error: `The task folder "${role.taskFolder}" is not a safe relative path.` };
  const dir = join(base, ...folder.split('/'));
  mkdirSync(dir, { recursive: true });
  for (const d of role.makeDirs) {
    const rel = normalizeTaskPath(d);
    if (rel) mkdirSync(join(dir, ...rel.split('/')), { recursive: true });
  }
  for (const f of role.files) {
    const rel = normalizeTaskPath(f.path);
    if (!rel) continue;
    const target = join(dir, ...rel.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
  }
  return { dir };
}

/** Required files (paths or globs) that are missing or empty. */
export function missingFiles(dir: string, patterns: string[]): string[] {
  let listed: string[] | null = null;
  return patterns.filter((pattern) => {
    const rel = normalizeTaskPath(pattern);
    if (!rel) return true;
    if (!/[*?{]/.test(rel)) return !nonEmpty(join(dir, ...rel.split('/')));
    listed ??= listFiles(dir);
    return !listed.some((p) => matchGlob(rel, p, caseless) && nonEmpty(join(dir, ...p.split('/'))));
  });
}

/** Files under the task folder matching a glob, newest-agnostic, capped. */
export function filesMatching(dir: string, glob: string, max: number): string[] {
  const rel = normalizeTaskPath(glob);
  if (!rel) return [];
  return listFiles(dir)
    .filter((p) => matchGlob(rel, p, caseless) && nonEmpty(join(dir, ...p.split('/'))))
    .sort()
    .slice(0, max);
}

/** Writes Claude's final reply where the stage keeps it; returns the path, or null when it could not. */
export function saveReply(dir: string, path: string | undefined, text: string): string | null {
  const rel = path ? normalizeTaskPath(path) : null;
  if (!rel) return null;
  try {
    const target = join(dir, ...rel.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    return rel;
  } catch {
    return null;
  }
}

/** Every file under dir as a forward-slash relative path, skipping tool caches. */
export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    if (out.length >= MAX_LISTED) return;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(current, entry.name));
      } else if (entry.isFile()) {
        out.push(relative(dir, join(current, entry.name)).split(sep).join('/'));
        if (out.length >= MAX_LISTED) return;
      }
    }
  };
  walk(dir);
  return out;
}

function nonEmpty(path: string): boolean {
  try {
    const s = statSync(path);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}
