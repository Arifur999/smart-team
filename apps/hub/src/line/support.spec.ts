import { lineByKey, memberById, stageOf } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import { formatRules, parseHouseRules, rulesFor } from './house-rules.js';
import { lineResumeSession } from './resume-rule.js';
import { readSettings, skipFlags } from './settings.js';
import { stagePrompt, stageSystemPrompt, writeScope, type StagePromptInput } from './stage-prompts.js';
import { absTaskFolder, taskFolderName } from './task-folder.js';

const line = lineByKey('nextEditor.video')!;

describe('readSettings', () => {
  it('falls back to defaults and keeps numbers in range', () => {
    expect(readSettings({}, line)).toEqual(line.defaults);
    const s = readSettings({ direction: 'concept', trust: true, passMark: 150, maxFixes: -2, skipStages: ['sound', 'critique'], extraChecks: ['storyboard-you', 'x'] }, line);
    expect(s).toEqual({ direction: 'concept', trust: true, passMark: 100, maxFixes: 0, skipStages: ['sound'], extraChecks: ['storyboard-you'] });
  });
});

describe('skipFlags', () => {
  it('reads no sound and a single format from the brief', () => {
    expect(skipFlags({ sound: 'None, silent please', format: '16:9 only' })).toEqual(['no-sound', 'single-format']);
    expect(skipFlags({ sound: 'music and effects', format: '16:9 master plus 9:16 and 1:1' })).toEqual([]);
    expect(skipFlags({ sound: 'Nothing special', format: '' })).toEqual([]);
  });
});

describe('taskFolderName', () => {
  it('makes a short dated ASCII folder name that never collides', () => {
    const at = new Date('2026-11-07T08:00:00Z');
    expect(taskFolderName('Naxified Motion — Reel!', '01a1ac22-7616-701c-9e06-509ad2930d66', at)).toBe('20261107-naxified-motion-reel-0d66');
    expect(taskFolderName('মোশন ভিডিও', '01a1ac22-7616-701c-9e06-509ad2930d66', at)).toBe('20261107-task-0d66');
    expect(taskFolderName('CON', 'abcd', at)).toBe('20261107-task-abcd');
  });

  it('joins with the PC\'s own separator', () => {
    expect(absTaskFolder('C:\\Work\\', '20261107-x-1234')).toBe('C:\\Work\\20261107-x-1234');
    expect(absTaskFolder('/home/me/work', 'a/b')).toBe('/home/me/work/a/b');
  });
});

describe('house rules', () => {
  const md = [
    '# nextEditor rules',
    '## R-ED-001 Light is soft',
    '- status: active',
    '- applies: storyboard, animate, critique',
    '- rule: Beams fade over at least 2% of the frame width.',
    '- check: zoom crop of every beam edge',
    '## R-ED-002 Old rule',
    '- status: retired: replaced',
    '- rule: whatever',
    '## R-ED-003 Everywhere',
    '- rule: No invented facts.',
  ].join('\n');

  it('parses rules and picks the active ones for a stage', () => {
    const rules = parseHouseRules(md);
    expect(rules.map((r) => r.id)).toEqual(['R-ED-001', 'R-ED-002', 'R-ED-003']);
    expect(rulesFor(rules, 'critique').map((r) => r.id)).toEqual(['R-ED-001', 'R-ED-003']);
    expect(rulesFor(rules, 'sound').map((r) => r.id)).toEqual(['R-ED-003']);
    expect(formatRules(rulesFor(rules, 'animate'))).toContain('(check: zoom crop of every beam edge)');
  });
});

describe('lineResumeSession', () => {
  const history = [
    { stage: 'animate', sessionId: 'a1', deviceId: 'pc1' },
    { stage: 'critique', sessionId: 'c1', deviceId: 'pc1' },
    { stage: 'animate', sessionId: 'a2', deviceId: 'pc1' },
  ];
  it('continues a retried attempt, or the stage\'s own last session on a fix round', () => {
    expect(lineResumeSession({ reason: 'line', stage: stageOf(line, 'animate')!, retryOf: 'x9', history, deviceId: 'pc1' })).toBe('x9');
    expect(lineResumeSession({ reason: 'fix', stage: stageOf(line, 'animate')!, retryOf: null, history, deviceId: 'pc1' })).toBe('a2');
    expect(lineResumeSession({ reason: 'fix', stage: stageOf(line, 'animate')!, retryOf: null, history, deviceId: 'pc2' })).toBeNull();
    expect(lineResumeSession({ reason: 'line', stage: stageOf(line, 'animate')!, retryOf: null, history, deviceId: 'pc1' })).toBeNull();
    expect(lineResumeSession({ reason: 'recheck', stage: stageOf(line, 'critique')!, retryOf: null, history, deviceId: 'pc1' })).toBeNull();
  });
});

describe('stage prompts', () => {
  const input: StagePromptInput = {
    line,
    stage: stageOf(line, 'animate')!,
    member: memberById('storm')!,
    teamLabel: 'nextEditor',
    taskTitle: 'Naxified motion',
    folderAbs: 'C:\\Work\\20261107-naxified-motion-0d66',
    settings: line.defaults,
    round: 2,
    v: 2,
    briefSummary: 'A 15 s motion video for naxified.com.',
    earlier: [{ label: 'Read source', ownerName: 'Wolverine', summary: '12 beats', files: ['01-source/style-spec.md'] }],
    fixes: [{ id: 'F3', severity: 'P0', stage: 'animate', at: '4.1', problem: 'Cut through black', fix: 'Hand each title to the next on the lit stage', from: 'beast' }],
    previousVerdict: null,
    rules: parseHouseRules('## R-ED-005 No black cuts\n- applies: animate\n- rule: No cut through black unless planned.'),
    requiredFiles: ['04-renders/v2/film.mp4'],
    triage: false,
  };

  it('tells the member who they are, where they may write and how to finish', () => {
    const system = stageSystemPrompt(input);
    expect(system).toContain('You are Storm, Editor of the nextEditor team');
    expect(system).toContain('04-renders/v2, build');
    expect(system).toContain('exactly one JSON object');
    expect(writeScope(stageOf(line, 'critique')!, 1, 3)).toEqual(['critique/v3', 'critique/v3.json']);
  });

  it('gives the brief, earlier work, the job, fixes, rules and the reply shape', () => {
    const prompt = stagePrompt(input);
    for (const part of ['# Animate & render (round 2)', 'A 15 s motion video', 'Read source (Wolverine): 12 beats', '04-renders/v2/film.mp4', 'F3 [P0] (at 4.1s): Cut through black', 'R-ED-005 No black cuts', '"stage":"animate"']) {
      expect(prompt).toContain(part);
    }
    // The animator matches frame by frame against the reference before the one full render.
    expect(prompt).toContain('pair_sheet.py --stills 04-renders/v2/match/stills');
  });

  it('gives sound its short re-lay job when it is redone only because the picture changed', () => {
    const sound = stageOf(line, 'sound')!;
    const quick = stagePrompt({ ...input, stage: sound, fixes: [], quick: true });
    expect(quick).toContain('lay the existing mix on the new render v2');
    expect(stagePrompt({ ...input, stage: sound, fixes: [] })).toContain('Score the picture');
  });
});
