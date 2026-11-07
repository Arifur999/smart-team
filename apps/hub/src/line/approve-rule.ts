import { YOU } from '@smart-team/shared';
/** How long a repeated approve counts as the same click. */
const REPEAT_APPROVE_MS = 2 * 60_000;

/** True when you approved a check or gate on this task in the last two minutes. */
export function approvedJustNow(steps: { status: string; kind: string; decidedBy: string | null; finishedAt: Date | null }[], now = Date.now()): boolean {
  return steps.some(
    (s) => s.status === 'DONE' && (s.kind === 'CHECK' || s.kind === 'GATE') && s.decidedBy === YOU && s.finishedAt !== null && now - s.finishedAt.getTime() < REPEAT_APPROVE_MS,
  );
}
