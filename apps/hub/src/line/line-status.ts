import {
  mainGate,
  memberById,
  STUCK_AFTER_MS,
  YOU,
  type LineAction,
  type LineDef,
  type LineSummary,
  type RunMode,
  type RunStatus,
  type StageKind,
  type StageStep,
  type TaskStatus,
} from '@smart-team/shared';
import { fixesUsed, type StepReason, type StepStatus } from './line-router.js';
import { readSettings } from './settings.js';

/** A step as the summary needs it, with its newest run. Oldest first. */
export interface StepRow {
  id: string;
  stage: string;
  kind: 'WORK' | 'GATE' | 'CHECK';
  ownerId: string;
  round: number;
  status: StepStatus;
  reason: string;
  score: number | null;
  summary: string | null;
  comment: string | null;
  decidedBy: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  lastRun: { status: RunStatus; mode: RunMode; updatedAt: Date } | null;
}

const KIND: Record<StepRow['kind'], StageKind> = { WORK: 'work', GATE: 'gate', CHECK: 'check' };

/** Where a task stands on its line, worked out from its steps. */
export function lineSummaryOf(input: { line: LineDef; settingsRaw: unknown; steps: StepRow[]; resumeAt: Date | null; now: Date }): LineSummary {
  const { line, steps, now } = input;
  const settings = readSettings(input.settingsRaw, line);
  const current = steps.at(-1) ?? null;
  const stageDef = current ? line.stages.find((s) => s.key === current.stage) : line.stages[0];
  const gate = mainGate(line);
  const lastScore = gate ? [...steps].reverse().find((s) => s.stage === gate.key && s.score !== null)?.score ?? null : null;

  let state: LineSummary['state'] = 'waiting';
  let stuck = false;
  if (current) {
    if (current.status === 'ACTIVE') {
      const run = current.lastRun;
      if (input.resumeAt && input.resumeAt > now) state = 'paused';
      else if (run?.status === 'RUNNING') {
        state = 'working';
        stuck = now.getTime() - run.updatedAt.getTime() > STUCK_AFTER_MS;
      } else state = 'queued';
    } else if (current.status === 'WAITING') state = current.kind === 'CHECK' ? 'waiting' : 'blocked';
    else if (current.status === 'CANCELLED') state = 'cancelled';
    else if (stageDef?.final && current.status === 'DONE') state = 'done';
    else state = 'queued';
  }

  const ended = state === 'done' || state === 'cancelled';
  const owner = ended ? null : (current?.ownerId ?? YOU);
  return {
    key: line.key,
    label: line.label,
    stage: ended ? null : (stageDef?.key ?? null),
    stageLabel: ended ? null : (stageDef?.label ?? null),
    kind: ended ? null : current ? KIND[current.kind] : 'check',
    ownerId: owner,
    ownerName: owner === YOU ? 'You' : owner ? (memberById(owner)?.name ?? owner) : null,
    state,
    note: current && (state === 'waiting' || state === 'blocked' || state === 'paused') ? current.comment : null,
    round: current?.round ?? 1,
    fixesUsed: gate ? fixesUsed(gate.key, steps.map(toLite)) : 0,
    maxFixes: settings.maxFixes,
    score: lastScore,
    passMark: settings.passMark,
    settings,
    since: current?.startedAt.toISOString() ?? null,
    stuck,
    path: pathOf(line, steps, current, now),
  };
}

function pathOf(line: LineDef, steps: StepRow[], current: StepRow | null, now: Date): StageStep[] {
  return line.stages.map((stage) => {
    const mine = steps.filter((s) => s.stage === stage.key);
    const ran = mine.filter((s) => s.status !== 'SKIPPED');
    const seconds = ran.reduce((sum, s) => sum + ((s.finishedAt ?? now).getTime() - s.startedAt.getTime()) / 1000, 0);
    const last = mine.at(-1);
    let status: StageStep['status'] = 'pending';
    if (current && last && last.id === current.id && current.status === 'ACTIVE') status = 'active';
    else if (current && last && last.id === current.id && current.status === 'WAITING') status = 'waiting';
    else if (mine.some((s) => s.status === 'DONE' || s.status === 'SENT_BACK')) status = 'done';
    else if (last?.status === 'SKIPPED') status = 'skipped';
    else if (last?.status === 'FAILED') status = 'failed';
    return {
      key: stage.key,
      status,
      rounds: ran.length,
      seconds: Math.round(seconds),
      agentId: last?.ownerId ?? (stage.owner === YOU ? YOU : stage.owner),
      score: [...mine].reverse().find((s) => s.score !== null)?.score ?? null,
      sentBack: mine.filter((s) => s.reason === 'fix').length,
    };
  });
}

/** The task status today's dashboard, Jarvis and badges already understand. */
export function lineTaskStatus(summary: LineSummary): TaskStatus {
  switch (summary.state) {
    case 'working':
      return 'RUNNING';
    case 'queued':
    case 'paused':
      return 'QUEUED';
    case 'waiting':
      return 'AWAITING_APPROVAL';
    case 'blocked':
      return 'FAILED';
    case 'done':
      return 'SUCCEEDED';
    case 'cancelled':
      return 'CANCELLED';
  }
}

/** What you can do now. */
export function lineActions(summary: LineSummary, current: StepRow | null): LineAction[] {
  switch (summary.state) {
    case 'waiting':
      return ['approve', 'send-back'];
    case 'blocked':
      // A gate that could not decide can be approved as it is; a stopped stage can be retried or skipped.
      return current?.kind === 'GATE' && current.score !== null ? ['approve', 'send-back', 'retry'] : ['retry', 'skip'];
    case 'paused':
      return ['retry'];
    case 'done':
      return ['send-back'];
    default:
      return [];
  }
}

function toLite(s: StepRow) {
  return { id: s.id, stage: s.stage, status: s.status, round: s.round, reason: s.reason as StepReason, route: null, causedById: null, decidedBy: s.decidedBy };
}
