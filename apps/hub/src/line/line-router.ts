import { mainGate, YOU, type FixNote, type LineDef, type LineSettings, type SkipWhen, type StageDef, type Verdict } from '@smart-team/shared';
import { parseStageReport, parseVerdict } from './verdict.js';

/**
 * Where work goes next on a production line. Pure functions over the line definition and the task's step
 * history, so every routing rule is unit tested; LineService only stores what these decide.
 */

export type StepStatus = 'ACTIVE' | 'WAITING' | 'DONE' | 'SENT_BACK' | 'SKIPPED' | 'FAILED' | 'CANCELLED';
/** line: the normal order. fix: redoing work a gate sent back. recheck: a gate judging the redone work. triage: the critic turning your notes into fixes. */
export type StepReason = 'line' | 'fix' | 'recheck' | 'triage';

/** Work sent back by a gate (or by you): the stages to redo in order, each with its notes, then the stage to go back to. */
export interface Route {
  stages: string[];
  notes: Record<string, FixNote[]>;
  rejoin: string;
}

/** The facts about a step the router needs, in creation order. */
export interface StepLite {
  id: string;
  stage: string;
  status: StepStatus;
  round: number;
  reason: StepReason;
  route: Route | null;
  causedById: string | null;
  decidedBy: string | null;
}

/** A stage to enter next. */
export interface Entry {
  stage: string;
  reason: StepReason;
  notes: FixNote[];
  causedById: string | null;
}

export function stageIndex(line: LineDef, key: string): number {
  return line.stages.findIndex((s) => s.key === key);
}

/** Why a stage is skipped right now, or null when it runs. Detours and rechecks never skip. */
export function skipReason(stage: StageDef, settings: LineSettings, flags: SkipWhen[]): string | null {
  if (stage.trustSkips && settings.trust) return 'Trust is on';
  if (stage.optional && !settings.extraChecks.includes(stage.key)) return 'Not asked for';
  if (stage.skippable) {
    if (settings.skipStages.includes(stage.key)) return 'Turned off';
    const when = stage.skippable.when;
    if (when && flags.includes(when)) return when === 'no-sound' ? 'No sound in the brief' : 'Only one format in the brief';
  }
  return null;
}

/** The stage after this one in line order, or null after the final check. */
export function lineNext(line: LineDef, key: string): string | null {
  return line.stages[stageIndex(line, key) + 1]?.key ?? null;
}

/**
 * The stages to redo for a set of fixes: every targeted work stage before the rejoin point, plus every work
 * stage that must be redone after one of those (rerunAfter, followed through), in line order. Stages that
 * are switched off stay off. Null when nothing is left to redo.
 */
export function buildDetour(line: LineDef, fixes: FixNote[], rejoin: string, isSkipped: (stage: StageDef) => boolean): Route | null {
  const rejoinAt = stageIndex(line, rejoin);
  const redoable = (key: string) => {
    const at = stageIndex(line, key);
    return at >= 0 && at < rejoinAt && line.stages[at]!.kind === 'work';
  };
  const include = new Set(fixes.map((f) => f.stage).filter(redoable));
  for (let grew = true; grew; ) {
    grew = false;
    for (const s of line.stages) {
      if (include.has(s.key) || !redoable(s.key)) continue;
      if (s.rerunAfter?.some((after) => include.has(after))) {
        include.add(s.key);
        grew = true;
      }
    }
  }
  const stages = line.stages.filter((s) => include.has(s.key) && !isSkipped(s)).map((s) => s.key);
  if (stages.length === 0) return null;
  const notes: Record<string, FixNote[]> = {};
  for (const f of fixes) if (stages.includes(f.stage)) (notes[f.stage] ??= []).push(f);
  return { stages, notes, rejoin };
}

/**
 * Where redone work is judged again: the main gate when anything before it was redone (so quality is checked
 * once more and everything after it runs again in order), otherwise `fallback`.
 */
export function rejoinFor(line: LineDef, stages: string[], fallback: string): string {
  const main = mainGate(line);
  if (!main) return fallback;
  const mainAt = stageIndex(line, main.key);
  return stages.some((k) => stageIndex(line, k) < mainAt) && stageIndex(line, fallback) >= mainAt ? main.key : fallback;
}

/** The first gate after the last of these stages: where your send-back is judged when you pick a stage. */
export function gateAfter(line: LineDef, stages: string[]): string | null {
  const last = Math.max(...stages.map((k) => stageIndex(line, k)));
  return line.stages.slice(last + 1).find((s) => s.kind === 'gate')?.key ?? null;
}

/** What comes after a finished step: the next stage of the detour it belongs to, the gate to go back to, or the next stage in line. */
export function nextAfterDone(step: StepLite, steps: StepLite[], line: LineDef): Entry | null {
  const cause = step.reason === 'fix' && step.causedById ? steps.find((s) => s.id === step.causedById) : undefined;
  if (cause?.route) {
    const next = cause.route.stages[cause.route.stages.indexOf(step.stage) + 1];
    if (next) return { stage: next, reason: 'fix', notes: cause.route.notes[next] ?? [], causedById: cause.id };
    return { stage: cause.route.rejoin, reason: 'recheck', notes: [], causedById: cause.id };
  }
  const next = lineNext(line, step.stage);
  return next ? { stage: next, reason: 'line', notes: [], causedById: null } : null;
}

/** First entry of a detour a step just sent back. */
export function detourStart(stepId: string, route: Route): Entry {
  const first = route.stages[0]!;
  return { stage: first, reason: 'fix', notes: route.notes[first] ?? [], causedById: stepId };
}

/** Send-backs by this gate that count against its budget: since your last decision, not counting triage rounds. */
export function fixesUsed(gateKey: string, steps: StepLite[]): number {
  let lastYou = -1;
  steps.forEach((s, i) => {
    if (s.decidedBy === YOU) lastYou = i;
  });
  return steps.slice(lastYou + 1).filter((s) => s.stage === gateKey && s.status === 'SENT_BACK' && s.reason !== 'triage').length;
}

export type RunFailureKind = 'usage-limit' | 'max-turns' | 'timeout' | 'missing-files' | 'agent-lost' | 'agent-outdated' | 'error';

export interface RunEnd {
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  failure: RunFailureKind | null;
  outcome: string;
  /** Required files the agent did not find (empty or missing). */
  missing: string[];
  hasSession: boolean;
  /** When a usage limit resets, if the agent knew. */
  retryAt: string | null;
}

export interface DecideContext {
  line: LineDef;
  stage: StageDef;
  step: StepLite;
  steps: StepLite[];
  settings: LineSettings;
  flags: SkipWhen[];
  /** Failure kinds of this step's runs so far, this one included. */
  attempts: (RunFailureKind | null)[];
  now: Date;
}

export type Decision =
  | { kind: 'ignore' }
  | { kind: 'retry'; resume: boolean; note: string }
  | { kind: 'pause'; until: Date }
  | { kind: 'blocked'; reason: string }
  | { kind: 'done'; summary: string; report: Record<string, unknown> | null }
  | { kind: 'pass'; verdict: Verdict }
  | { kind: 'fix'; verdict: Verdict; route: Route }
  | { kind: 'continue'; verdict: Verdict; reason: string }
  | { kind: 'escalate'; verdict: Verdict | null; reason: string };

const PAUSE_WITHOUT_RESET_MS = 30 * 60_000;

/** What to do when one of a stage's runs ends. */
export function decideAfterRun(c: DecideContext, end: RunEnd): Decision {
  if (end.status === 'CANCELLED') return { kind: 'ignore' };
  const tries = c.attempts.filter((a) => a !== 'usage-limit').length;
  const why = firstLine(end.outcome);

  if (end.status === 'FAILED') {
    if (end.failure === 'usage-limit') {
      const reset = end.retryAt ? new Date(end.retryAt) : null;
      return { kind: 'pause', until: reset && reset > c.now ? reset : new Date(c.now.getTime() + PAUSE_WITHOUT_RESET_MS) };
    }
    if (end.failure === 'agent-outdated') return { kind: 'blocked', reason: 'Update smart-team on this PC: its agent is too old for production lines.' };
    const limit = end.failure === 'agent-lost' ? 3 : 2;
    if (tries < limit) return { kind: 'retry', resume: end.hasSession, note: `The previous attempt stopped (${why}). Check what is already done and finish the stage.` };
    return { kind: 'blocked', reason: `${c.stage.label} failed ${tries} times: ${why}` };
  }

  if (end.missing.length > 0) {
    if (tries < 2) return { kind: 'retry', resume: end.hasSession, note: `These required files are missing or empty: ${end.missing.join(', ')}. Make them, then reply again.` };
    return { kind: 'blocked', reason: `${c.stage.label} finished without ${end.missing.join(', ')}.` };
  }

  if (c.stage.kind === 'work') {
    const report = parseStageReport(end.outcome);
    if (report.blocked) return { kind: 'blocked', reason: report.blocked };
    return { kind: 'done', summary: report.summary, report: report.data };
  }

  const gate = c.stage.gate!;
  const verdict = parseVerdict(end.outcome, { line: c.line, stage: c.stage, settings: c.settings, from: c.stage.owner });
  if (!verdict) {
    if (tries < 2) return { kind: 'retry', resume: end.hasSession, note: 'Your reply did not end with the verdict JSON. Reply with only that JSON object.' };
    return { kind: 'escalate', verdict: null, reason: `${c.stage.label}: the verdict could not be read.` };
  }

  const triage = c.step.reason === 'triage';
  if (verdict.pass && !triage) return { kind: 'pass', verdict };

  const isSkipped = (s: StageDef) => skipReason(s, c.settings, c.flags) !== null;
  const fixes = verdict.fixes.filter((f) => gate.fixTargets.includes(f.stage));
  const routeFor = () => buildDetour(c.line, fixes, rejoinFor(c.line, fixes.map((f) => f.stage), c.stage.key), isSkipped);

  if (triage) {
    const route = fixes.length > 0 ? routeFor() : null;
    if (route) return { kind: 'fix', verdict, route };
    if (tries < 2) return { kind: 'retry', resume: end.hasSession, note: 'Turn each of the notes from the client into a fix routed to a stage, then reply with the verdict JSON.' };
    return { kind: 'escalate', verdict, reason: 'Your notes could not be turned into fixes.' };
  }

  const budget = gate.main ? c.settings.maxFixes : (gate.maxFixes ?? 0);
  const used = fixesUsed(c.stage.key, c.steps);
  if (used >= budget) return { kind: 'continue', verdict, reason: `${c.stage.label} sent it back ${used} times already; going on with known issues.` };
  const route = fixes.length > 0 ? routeFor() : null;
  if (route) return { kind: 'fix', verdict, route };
  if (tries < 2) return { kind: 'retry', resume: end.hasSession, note: 'Your verdict failed but gave no fixes. Add the fixes (stage, problem, exact change) and reply with the verdict JSON.' };
  return { kind: 'continue', verdict, reason: `${c.stage.label} did not pass and gave no fixes; going on with known issues.` };
}

function firstLine(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? 'no details';
  return line.length > 200 ? `${line.slice(0, 200)}…` : line;
}
