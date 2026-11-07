import type { StageDef } from '@smart-team/shared';
import type { StepReason } from './line-router.js';

export interface StageRunSession {
  stage: string | null;
  sessionId: string | null;
  deviceId: string;
}

/**
 * Which Claude session a line run continues, chosen when it is queued. Every stage starts fresh, so each
 * member brings their own eyes; a retry continues the attempt that stopped; a fix round continues the
 * stage's own last session (on the same PC) when the stage asks for it. Gates never continue a session.
 */
export function lineResumeSession(input: {
  reason: StepReason;
  stage: StageDef;
  /** Session of the attempt being retried, if it had one. */
  retryOf: string | null;
  /** The task's earlier line runs, oldest first. */
  history: StageRunSession[];
  deviceId: string;
}): string | null {
  if (input.retryOf) return input.retryOf;
  if (input.reason !== 'fix' || !input.stage.resumeOnFix || input.stage.kind !== 'work') return null;
  const last = [...input.history].reverse().find((r) => r.stage === input.stage.key && r.sessionId && r.deviceId === input.deviceId);
  return last?.sessionId ?? null;
}
