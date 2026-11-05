import { describe, expect, it } from 'vitest';
import { buildClaudeArgs, outcomeOf, UsageTally } from './claude-runner.js';
import type { ClaudeConfig } from './config.js';

const claude: ClaudeConfig = { command: 'claude', permissionMode: 'acceptEdits', allowedTools: ['Bash(npm test:*)'] };

describe('buildClaudeArgs', () => {
  it('runs plans in read-only plan mode and ignores the extra tools', () => {
    const args = buildClaudeArgs({ mode: 'PLAN' }, claude);
    expect(args).toEqual(expect.arrayContaining(['-p', '--output-format', 'stream-json', '--verbose']));
    expect(args.slice(args.indexOf('--permission-mode'), args.indexOf('--permission-mode') + 2)).toEqual(['--permission-mode', 'plan']);
    expect(args).not.toContain('--allowedTools');
  });

  it('runs approved work with the configured mode, tools and session', () => {
    const args = buildClaudeArgs({ mode: 'EXECUTE', resumeSessionId: 'abc' }, { ...claude, maxTurns: 40 });
    expect(args).toEqual(
      expect.arrayContaining(['--permission-mode', 'acceptEdits', '--allowedTools', 'Bash(npm test:*)', '--max-turns', '40', '--resume', 'abc']),
    );
  });
});

describe('UsageTally', () => {
  const u = (input: number, output: number) => ({ input, output, cacheRead: 0, cacheCreation: 0 });

  it('counts a repeated message once, using its latest numbers', () => {
    const tally = new UsageTally();
    tally.record('m1', u(2, 5));
    tally.record('m1', u(2, 40));
    tally.record('m2', u(3, 10));
    expect(tally.total()).toEqual(u(5, 50));
  });

  it('reports the total only when it changed', () => {
    const tally = new UsageTally();
    expect(tally.takeIfChanged()).toBeUndefined();
    tally.record('m1', u(1, 1));
    expect(tally.takeIfChanged()).toEqual(u(1, 1));
    expect(tally.takeIfChanged()).toBeUndefined();
    tally.record('m1', u(1, 2));
    expect(tally.takeIfChanged()).toEqual(u(1, 2));
  });
});

describe('outcomeOf', () => {
  it('reports cancellation first', () => {
    expect(outcomeOf({ cancelled: true, exitCode: 1, stderrTail: 'killed' }).status).toBe('CANCELLED');
  });

  it('uses the final result when Claude sent one', () => {
    expect(outcomeOf({ cancelled: false, exitCode: 0, stderrTail: '', final: { isError: false, text: 'Done' } })).toEqual({
      status: 'SUCCEEDED',
      outcome: 'Done',
    });
    expect(outcomeOf({ cancelled: false, exitCode: 1, stderrTail: '', final: { isError: true, text: 'Max turns' } }).status).toBe('FAILED');
  });

  it('explains failures without a final result', () => {
    expect(outcomeOf({ cancelled: false, exitCode: 1, stderrTail: '  not logged in \n' })).toEqual({ status: 'FAILED', outcome: 'not logged in' });
    expect(outcomeOf({ cancelled: false, exitCode: 3, stderrTail: '' }).outcome).toBe('Claude Code exited with code 3 before finishing.');
    expect(outcomeOf({ cancelled: false, exitCode: null, stderrTail: '', spawnError: new Error('ENOENT') }).outcome).toBe(
      'Could not start Claude Code: ENOENT',
    );
  });
});
