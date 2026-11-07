import { lineByKey, stageOf, YOU, type FixNote, type LineSettings } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import {
  buildDetour,
  decideAfterRun,
  fixesUsed,
  gateAfter,
  nextAfterDone,
  rejoinFor,
  skipReason,
  type DecideContext,
  type RunEnd,
  type StepLite,
} from './line-router.js';

const line = lineByKey('nextEditor.video')!;
const settings: LineSettings = { ...line.defaults };
const stage = (key: string) => stageOf(line, key)!;
const noSkip = () => false;
const fix = (stageKey: string, severity: FixNote['severity'] = 'P1'): FixNote => ({ id: 'F', severity, stage: stageKey, problem: 'p', fix: 'f', from: 'beast' });

let ids = 0;
const step = (s: Partial<StepLite> & { stage: string }): StepLite => ({
  id: `s${++ids}`,
  status: 'DONE',
  round: 1,
  reason: 'line',
  route: null,
  causedById: null,
  decidedBy: null,
  ...s,
});

describe('skipReason', () => {
  it('skips your Ready check only with Trust, never the final review', () => {
    expect(skipReason(stage('ready'), settings, [])).toBeNull();
    expect(skipReason(stage('ready'), { ...settings, trust: true }, [])).toBe('Trust is on');
    expect(skipReason(stage('review'), { ...settings, trust: true }, [])).toBeNull();
  });

  it('runs optional checks only when asked and drops sound when the brief has none', () => {
    expect(skipReason(stage('storyboard-you'), settings, [])).toBe('Not asked for');
    expect(skipReason(stage('storyboard-you'), { ...settings, extraChecks: ['storyboard-you'] }, [])).toBeNull();
    expect(skipReason(stage('sound'), settings, ['no-sound'])).toBe('No sound in the brief');
    expect(skipReason(stage('sound'), { ...settings, skipStages: ['sound'] }, [])).toBe('Turned off');
    expect(skipReason(stage('variants'), settings, ['single-format'])).toBe('Only one format in the brief');
  });
});

describe('buildDetour', () => {
  it('redoes the targeted stage and everything that depends on it, in line order', () => {
    const route = buildDetour(line, [fix('storyboard', 'P0'), fix('sound')], 'critique', noSkip)!;
    expect(route.stages).toEqual(['storyboard', 'animate', 'sound']);
    expect(Object.keys(route.notes)).toEqual(['storyboard', 'sound']);
    expect(route.rejoin).toBe('critique');
  });

  it('a plan fix redoes the plan and everything built on it', () => {
    expect(buildDetour(line, [fix('plan')], 'critique', noSkip)!.stages).toEqual(['plan', 'storyboard', 'animate', 'sound']);
  });

  it('leaves switched-off stages out', () => {
    const route = buildDetour(line, [fix('animate')], 'critique', (s) => s.key === 'sound')!;
    expect(route.stages).toEqual(['animate']);
  });

  it('returns null when nothing before the rejoin point can be redone', () => {
    expect(buildDetour(line, [fix('variants')], 'critique', noSkip)).toBeNull();
  });
});

describe('rejoinFor and gateAfter', () => {
  it('sends redone work back through the main gate when it changed something before it', () => {
    expect(rejoinFor(line, ['animate'], 'final-qa')).toBe('critique');
    expect(rejoinFor(line, ['variants'], 'final-qa')).toBe('final-qa');
    expect(rejoinFor(line, ['storyboard'], 'storyboard-check')).toBe('storyboard-check');
  });

  it('finds the first gate after a stage', () => {
    expect(gateAfter(line, ['storyboard'])).toBe('storyboard-check');
    expect(gateAfter(line, ['variants'])).toBe('final-qa');
  });
});

describe('nextAfterDone', () => {
  it('follows the line, then a detour, then goes back to the gate', () => {
    const plan = step({ stage: 'plan' });
    expect(nextAfterDone(plan, [plan], line)).toMatchObject({ stage: 'ready', reason: 'line' });

    const gate = step({ stage: 'critique', status: 'SENT_BACK', route: { stages: ['storyboard', 'animate'], notes: { storyboard: [fix('storyboard')] }, rejoin: 'critique' } });
    const sb = step({ stage: 'storyboard', reason: 'fix', causedById: gate.id });
    const steps = [gate, sb];
    expect(nextAfterDone(sb, steps, line)).toMatchObject({ stage: 'animate', reason: 'fix', causedById: gate.id, notes: [] });
    const an = step({ stage: 'animate', reason: 'fix', causedById: gate.id });
    expect(nextAfterDone(an, [...steps, an], line)).toMatchObject({ stage: 'critique', reason: 'recheck' });

    const recheck = step({ stage: 'critique', reason: 'recheck', causedById: gate.id });
    expect(nextAfterDone(recheck, [...steps, an, recheck], line)).toMatchObject({ stage: 'screening', reason: 'line' });
  });

  it('ends after the final review', () => {
    const review = step({ stage: 'review' });
    expect(nextAfterDone(review, [review], line)).toBeNull();
  });
});

describe('fixesUsed', () => {
  it('counts send-backs since your last decision, not triage rounds', () => {
    const steps = [
      step({ stage: 'critique', status: 'SENT_BACK' }),
      step({ stage: 'critique', status: 'SENT_BACK' }),
      step({ stage: 'review', decidedBy: YOU }),
      step({ stage: 'critique', status: 'SENT_BACK', reason: 'triage' }),
      step({ stage: 'critique', status: 'SENT_BACK', reason: 'recheck' }),
    ];
    expect(fixesUsed('critique', steps)).toBe(1);
  });
});

describe('decideAfterRun', () => {
  const now = new Date('2026-11-07T10:00:00Z');
  const end = (e: Partial<RunEnd>): RunEnd => ({ status: 'SUCCEEDED', failure: null, outcome: '', missing: [], hasSession: true, retryAt: null, ...e });
  const ctxFor = (key: string, extra: Partial<DecideContext> = {}): DecideContext => {
    const s = step({ stage: key, status: 'ACTIVE' });
    return { line, stage: stage(key), step: s, steps: [s], settings, flags: [], attempts: [null], now, ...extra };
  };
  const dims = (score: number) => ['light', 'type', 'timing', 'transitions', 'brand', 'safe', 'tech'].map((id) => ({ id, score }));

  it('ignores cancelled runs and pauses on a usage limit until it resets', () => {
    expect(decideAfterRun(ctxFor('animate'), end({ status: 'CANCELLED' }))).toEqual({ kind: 'ignore' });
    const paused = decideAfterRun(ctxFor('animate'), end({ status: 'FAILED', failure: 'usage-limit', retryAt: '2026-11-07T13:00:00Z' }));
    expect(paused).toEqual({ kind: 'pause', until: new Date('2026-11-07T13:00:00Z') });
  });

  it('retries a failure once, then blocks; a lost PC gets two retries', () => {
    expect(decideAfterRun(ctxFor('animate'), end({ status: 'FAILED', failure: 'error', outcome: 'boom' })).kind).toBe('retry');
    expect(decideAfterRun(ctxFor('animate', { attempts: ['error', 'error'] }), end({ status: 'FAILED', failure: 'error' })).kind).toBe('blocked');
    expect(decideAfterRun(ctxFor('animate', { attempts: ['agent-lost', 'agent-lost'] }), end({ status: 'FAILED', failure: 'agent-lost' })).kind).toBe('retry');
    expect(decideAfterRun(ctxFor('animate', { attempts: ['usage-limit', 'error'] }), end({ status: 'FAILED', failure: 'error' })).kind).toBe('retry');
  });

  it('asks again for missing files, then blocks', () => {
    const missing = end({ missing: ['04-renders/v1/film.mp4'] });
    expect(decideAfterRun(ctxFor('animate'), missing)).toMatchObject({ kind: 'retry' });
    expect(decideAfterRun(ctxFor('animate', { attempts: [null, null] }), missing).kind).toBe('blocked');
  });

  it('finishes work stages, or blocks when the member needs something from you', () => {
    expect(decideAfterRun(ctxFor('source'), end({ outcome: '{"summary":"12 beats"}' }))).toMatchObject({ kind: 'done', summary: '12 beats' });
    expect(decideAfterRun(ctxFor('source'), end({ outcome: '{"blocked":"the reference video"}' }))).toEqual({ kind: 'blocked', reason: 'the reference video' });
  });

  it('passes a good verdict and sends a weak one back with a detour', () => {
    expect(decideAfterRun(ctxFor('critique'), end({ outcome: JSON.stringify({ dimensions: dims(9) }) })).kind).toBe('pass');
    const weak = decideAfterRun(ctxFor('critique'), end({ outcome: JSON.stringify({ dimensions: dims(5), fixes: [{ severity: 'P0', stage: 'storyboard', problem: 'flat beams' }] }) }));
    expect(weak).toMatchObject({ kind: 'fix', route: { stages: ['storyboard', 'animate', 'sound'], rejoin: 'critique' } });
  });

  it('goes on with known issues once the fix budget is spent', () => {
    const sent = [1, 2, 3].map(() => step({ stage: 'critique', status: 'SENT_BACK' }));
    const current = step({ stage: 'critique', status: 'ACTIVE', reason: 'recheck' });
    const c = ctxFor('critique', { step: current, steps: [...sent, current] });
    const out = decideAfterRun(c, end({ outcome: JSON.stringify({ dimensions: dims(5), fixes: [{ stage: 'animate', problem: 'x' }] }) }));
    expect(out.kind).toBe('continue');
  });

  it('asks once more for an unreadable verdict, then hands it to you', () => {
    expect(decideAfterRun(ctxFor('critique'), end({ outcome: 'looks fine' })).kind).toBe('retry');
    expect(decideAfterRun(ctxFor('critique', { attempts: [null, null] }), end({ outcome: 'looks fine' })).kind).toBe('escalate');
  });

  it('never passes a triage round and routes your notes as fixes', () => {
    const triage = step({ stage: 'critique', status: 'ACTIVE', reason: 'triage' });
    const out = decideAfterRun(
      ctxFor('critique', { step: triage, steps: [triage] }),
      end({ outcome: JSON.stringify({ dimensions: dims(9), fixes: [{ stage: 'sound', problem: 'music too loud' }] }) }),
    );
    expect(out).toMatchObject({ kind: 'fix', route: { stages: ['sound'] } });
  });
});
