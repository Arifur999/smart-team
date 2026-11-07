/** Names Windows will not allow as a file or folder name. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_SLUG = 32;

/**
 * The task's own folder inside its work folder, e.g. "20261107-naxified-motion-3f9a": the date, a short ASCII
 * slug of the title (a Bangla-only title becomes "task") and the end of the id so two tasks never share one.
 * Kept short because video projects nest deep and Windows paths have a length limit.
 */
export function taskFolderName(title: string, id: string, createdAt: Date, root?: string): string {
  const date = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  let slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
  if (!slug || RESERVED.test(slug)) slug = 'task';
  const name = `${date}-${slug}-${id.replace(/-/g, '').slice(-4)}`;
  return root ? `${root.replace(/[\\/]+$/, '')}/${name}` : name;
}

/** Joins the task folder onto the work folder with the PC's own separator. */
export function absTaskFolder(workDir: string, folder: string): string {
  const windows = /^[a-zA-Z]:[\\/]/.test(workDir) || workDir.startsWith('\\\\');
  const sep = windows ? '\\' : '/';
  return `${workDir.replace(/[\\/]+$/, '')}${sep}${folder.split('/').join(sep)}`;
}
