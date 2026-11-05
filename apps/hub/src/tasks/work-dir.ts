import { posix, win32 } from 'node:path';

/**
 * True when `dir` is one of `folders` or inside one, using the path rules of the PC that owns them.
 * The agent repeats this check against the real file system before it runs anything.
 */
export function isInsideFolders(dir: string, folders: string[], platform: string): boolean {
  const path = platform === 'win32' ? win32 : posix;
  const normalize = (p: string) => {
    const resolved = path.resolve(p);
    return platform === 'win32' ? resolved.toLowerCase() : resolved;
  };

  const target = normalize(dir);
  return folders.some((folder) => {
    const root = normalize(folder);
    const rel = path.relative(root, target);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}
