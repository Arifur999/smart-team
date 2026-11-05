import { realpathSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';

/**
 * Resolves `dir` on disk and checks it sits inside one of the shared folders, after following
 * symlinks and junctions so a link inside a shared folder cannot point somewhere else.
 * Returns the resolved path, or null when it is missing or outside.
 */
export function resolveAllowedDir(dir: string, folders: string[], realpath: (p: string) => string = realpathSync.native): string | null {
  let target: string;
  try {
    target = realpath(dir);
  } catch {
    return null;
  }

  const caseless = process.platform === 'win32';
  const norm = (p: string) => (caseless ? p.toLowerCase() : p);

  for (const folder of folders) {
    let root: string;
    try {
      root = realpath(folder);
    } catch {
      continue;
    }
    const rel = relative(norm(root), norm(target));
    if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) return target;
  }
  return null;
}
