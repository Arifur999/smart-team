import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunRole } from '@smart-team/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { buildClaudeArgs, failureKind } from './claude-runner.js';
import type { ClaudeConfig } from './config.js';
import { filesMatching, missingFiles, prepareTaskFolder, saveReply } from './stage-files.js';

const shared = mkdtempSync(join(tmpdir(), 'st-stage-'));
afterAll(() => rmSync(shared, { recursive: true, force: true }));

const role: RunRole = {
  memberId: 'storm',
  memberName: 'Storm',
  stage: 'animate',
  stageLabel: 'Animate & render',
  systemPrompt: 'You are Storm.',
  access: 'write',
  taskFolder: '20261107-reel-0d66',
  makeDirs: ['04-renders/v1', 'build'],
  files: [{ path: '00-brief/brief.md', content: '# Brief' }],
  requiredFiles: ['04-renders/v1/film.mp4', '03-storyboard/v1/stills/*.png'],
  deliverables: [],
  saveReplyTo: 'critique/v1.json',
};

describe('prepareTaskFolder', () => {
  it('makes the task folder, its stage folders and the brief inside a shared folder', () => {
    const prepared = prepareTaskFolder(shared, role, [shared]);
    expect('dir' in prepared).toBe(true);
    const dir = (prepared as { dir: string }).dir;
    expect(readFileSync(join(dir, '00-brief', 'brief.md'), 'utf8')).toBe('# Brief');
  });

  it('refuses work folders that are not shared and unsafe task folders', () => {
    expect(prepareTaskFolder(join(tmpdir(), 'not-shared-xyz'), role, [shared])).toHaveProperty('error');
    expect(prepareTaskFolder(shared, { ...role, taskFolder: '../escape' }, [shared])).toHaveProperty('error');
  });
});

describe('missingFiles, filesMatching and saveReply', () => {
  const dir = join(shared, role.taskFolder);

  it('finds missing or empty required files, by path or glob', () => {
    mkdirSync(join(dir, '04-renders', 'v1'), { recursive: true });
    writeFileSync(join(dir, '04-renders', 'v1', 'film.mp4'), '');
    expect(missingFiles(dir, role.requiredFiles)).toEqual(role.requiredFiles);

    writeFileSync(join(dir, '04-renders', 'v1', 'film.mp4'), 'video');
    mkdirSync(join(dir, '03-storyboard', 'v1', 'stills'), { recursive: true });
    writeFileSync(join(dir, '03-storyboard', 'v1', 'stills', 'F01.png'), 'png');
    expect(missingFiles(dir, role.requiredFiles)).toEqual([]);
    expect(filesMatching(dir, '03-storyboard/v1/stills/*.png', 5)).toEqual(['03-storyboard/v1/stills/F01.png']);
  });

  it('saves the reply inside the task folder only', () => {
    expect(saveReply(dir, 'critique/v1.json', '{"pass":true}')).toBe('critique/v1.json');
    expect(readFileSync(join(dir, 'critique', 'v1.json'), 'utf8')).toBe('{"pass":true}');
    expect(saveReply(dir, '../outside.json', 'x')).toBeNull();
  });
});

describe('line stage command line', () => {
  const claude: ClaudeConfig = { command: 'claude', permissionMode: 'bypassPermissions', allowedTools: ['Bash', 'Edit', 'Write'], maxTurns: 200 };

  it('gives a review stage its persona but no editing tools', () => {
    const args = buildClaudeArgs({ mode: 'EXECUTE', role: { ...role, access: 'review', maxTurns: 80, model: 'claude-opus-5-5' } }, claude);
    expect(args).toEqual(expect.arrayContaining(['--permission-mode', 'bypassPermissions', '--disallowedTools', 'Edit', 'Write', 'NotebookEdit', '--model', 'claude-opus-5-5']));
    expect(args[args.indexOf('--append-system-prompt') + 1]).toContain('You are Storm.');
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('Bash');
    expect(args[args.indexOf('--max-turns') + 1]).toBe('80');
  });

  it('runs a plan stage in plan mode', () => {
    const args = buildClaudeArgs({ mode: 'PLAN', role: { ...role, access: 'plan' } }, claude);
    expect(args.slice(args.indexOf('--permission-mode'), args.indexOf('--permission-mode') + 2)).toEqual(['--permission-mode', 'plan']);
    expect(args).not.toContain('--allowedTools');
  });

  it('names why a run failed', () => {
    expect(failureKind({ timedOut: true })).toBe('timeout');
    expect(failureKind({ timedOut: false, limit: {} })).toBe('usage-limit');
    expect(failureKind({ timedOut: false, final: { isError: true, text: '', subtype: 'error_max_turns' } })).toBe('max-turns');
    expect(failureKind({ timedOut: false })).toBe('error');
  });
});
