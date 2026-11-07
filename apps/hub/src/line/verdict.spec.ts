import { lineByKey, stageOf, type LineSettings } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import { extractLastJson, parseStageReport, parseVerdict, readScore } from './verdict.js';

const line = lineByKey('nextEditor.video')!;
const settings: LineSettings = { ...line.defaults };
const critique = stageOf(line, 'critique')!;
const screening = stageOf(line, 'screening')!;
const ctx = (stage = critique, s = settings) => ({ line, stage, settings: s, from: stage.owner });

const allDims = (score: number) =>
  ['light', 'type', 'timing', 'transitions', 'brand', 'safe', 'tech'].map((id) => ({ id, score }));

describe('extractLastJson', () => {
  it('prefers the last fenced block', () => {
    const text = 'first ```json\n{"a":1}\n``` then ```json\n{"a":2}\n```';
    expect(extractLastJson(text)).toEqual({ a: 2 });
  });

  it('finds the last balanced object, respecting braces and quotes inside strings', () => {
    const text = 'He said "use {curly} braces" and wrote {"note":"a } b \\" c","n":1} then done.';
    expect(extractLastJson(text)).toEqual({ note: 'a } b " c', n: 1 });
  });

  it('returns null without JSON', () => {
    expect(extractLastJson('no json here')).toBeNull();
  });
});

describe('readScore', () => {
  it('reads numbers out of 100 or 10 and clamps them', () => {
    expect(readScore(82)).toBe(82);
    expect(readScore('82/100')).toBe(82);
    expect(readScore('8.2/10')).toBe(82);
    expect(readScore(8.2)).toBe(82);
    expect(readScore(140)).toBe(100);
    expect(readScore('n/a')).toBeNull();
  });
});

describe('parseVerdict', () => {
  it('recomputes the score from the rubric and passes only when every rule holds', () => {
    const v = parseVerdict(JSON.stringify({ score: 50, pass: false, summary: 'good', dimensions: allDims(9), must_pass: [{ id: 'MP1', ok: true }], fixes: [] }), ctx())!;
    expect(v.score).toBe(90);
    expect(v.pass).toBe(true);
    expect(v.scoreMismatch).toEqual({ reported: 50, computed: 90 });
  });

  it('fails on a P0 fix, a failed must-pass or a weak dimension even with a high score', () => {
    const base = { dimensions: allDims(9), must_pass: [{ id: 'MP1', ok: true }] };
    const p0 = parseVerdict(JSON.stringify({ ...base, fixes: [{ severity: 'P0', stage: 'animate', problem: 'black cut' }] }), ctx())!;
    expect(p0.pass).toBe(false);
    const mp = parseVerdict(JSON.stringify({ ...base, must_pass: [{ id: 'MP1', ok: false }] }), ctx())!;
    expect(mp.pass).toBe(false);
    const weak = parseVerdict(JSON.stringify({ ...base, dimensions: [...allDims(9).slice(1), { id: 'light', score: 5 }] }), ctx())!;
    expect(weak.score).toBeGreaterThanOrEqual(80);
    expect(weak.pass).toBe(false);
  });

  it('uses your pass mark for the main gate', () => {
    const text = JSON.stringify({ dimensions: allDims(8), fixes: [] });
    expect(parseVerdict(text, ctx())!.pass).toBe(true);
    expect(parseVerdict(text, ctx(critique, { ...settings, passMark: 85 }))!.pass).toBe(false);
  });

  it('routes fixes by key or label, sends unknown stages to the default and puts P0 first', () => {
    const v = parseVerdict(
      JSON.stringify({
        dimensions: allDims(5),
        fixes: [
          { severity: 'minor', stage: 'Sound', problem: 'quiet' },
          { severity: 'critical', stage: 'Style frames', problem: 'flat beams', fix: 'blur 8/28/70 px' },
          { stage: 'lighting dept', problem: 'odd' },
          { stage: 'final-qa', problem: 'not a target' },
          'a plain string note',
        ],
      }),
      ctx(),
    )!;
    expect(v.fixes.map((f) => [f.severity, f.stage])).toEqual([
      ['P0', 'storyboard'],
      ['P1', 'animate'],
      ['P1', 'animate'],
      ['P1', 'animate'],
      ['P2', 'sound'],
    ]);
    expect(v.fixes.every((f) => f.from === 'beast')).toBe(true);
  });

  it('keeps at most 12 fixes and drops duplicates', () => {
    const fixes = Array.from({ length: 20 }, (_, i) => ({ stage: 'animate', problem: `problem ${i % 15}` }));
    expect(parseVerdict(JSON.stringify({ dimensions: allDims(5), fixes }), ctx())!.fixes).toHaveLength(12);
  });

  it('takes a pass/fail gate at its word unless it lists a P0', () => {
    expect(parseVerdict('{"pass":true,"summary":"ship it"}', ctx(screening))!.pass).toBe(true);
    expect(parseVerdict('{"pass":true,"fixes":[{"severity":"P0","stage":"animate","problem":"typo"}]}', ctx(screening))!.pass).toBe(false);
    expect(parseVerdict('{"pass":false}', ctx(screening))!.pass).toBe(false);
  });

  it('returns null when there is no JSON', () => {
    expect(parseVerdict('I think it is fine.', ctx())).toBeNull();
  });
});

describe('parseStageReport', () => {
  it('reads the summary and a blocked request, or falls back to the reply start', () => {
    expect(parseStageReport('done\n{"summary":"12 beats","beats":12}').summary).toBe('12 beats');
    expect(parseStageReport('{"blocked":"the logo file"}').blocked).toBe('the logo file');
    expect(parseStageReport('All done without JSON.').summary).toBe('All done without JSON.');
  });
});
