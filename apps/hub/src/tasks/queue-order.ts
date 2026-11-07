/** A queued run as the queue sees it. */
export interface QueuedRun {
  id: string;
  taskId: string;
  taskCreatedAt: Date;
}

/**
 * Which queued run a free PC takes next: tasks take turns, so a long video in fix rounds never starves the one
 * queued behind it. The task whose last run ended longest ago goes first (a task that never ran counts as
 * oldest); ties go to the older task. Within a task, its oldest queued run.
 */
export function pickNextRun<T extends QueuedRun>(queued: T[], lastEndedByTask: Map<string, Date>): T | null {
  let best: T | null = null;
  const waited = (r: T) => lastEndedByTask.get(r.taskId)?.getTime() ?? -Infinity;
  for (const run of queued) {
    if (!best) {
      best = run;
      continue;
    }
    const a = waited(run);
    const b = waited(best);
    if (a < b || (a === b && run.taskCreatedAt.getTime() < best.taskCreatedAt.getTime())) best = run;
  }
  return best;
}
