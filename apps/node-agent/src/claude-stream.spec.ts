import { MAX_LOG_TEXT } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';
import { describeToolCall, parseStreamLine } from './claude-stream.js';

const line = (event: unknown) => JSON.stringify(event);

describe('parseStreamLine', () => {
  it('reports the session start', () => {
    expect(parseStreamLine(line({ type: 'system', subtype: 'init', cwd: 'D:\\work' })).lines).toEqual([
      { kind: 'status', text: 'Session started in D:\\work' },
    ]);
  });

  it('splits an assistant message into text and tool calls', () => {
    const parsed = parseStreamLine(
      line({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Creating the file.' },
            { type: 'tool_use', name: 'Write', input: { file_path: 'D:\\work\\hello.txt', content: 'hi' } },
          ],
        },
      }),
    );
    expect(parsed.lines).toEqual([
      { kind: 'text', text: 'Creating the file.' },
      { kind: 'tool', text: 'Write: D:\\work\\hello.txt' },
    ]);
  });

  it('reads tool results given as a string or as text blocks, and flags errors', () => {
    expect(parseStreamLine(line({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } })).lines).toEqual([
      { kind: 'tool_result', text: 'ok' },
    ]);
    expect(
      parseStreamLine(
        line({ type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: [{ type: 'text', text: 'boom' }] }] } }),
      ).lines,
    ).toEqual([{ kind: 'error', text: 'boom' }]);
  });

  it('reads token usage from assistant messages', () => {
    const parsed = parseStreamLine(
      line({
        type: 'assistant',
        message: { id: 'msg_1', content: [], usage: { input_tokens: 2, output_tokens: 40, cache_read_input_tokens: 900, cache_creation_input_tokens: 100 } },
      }),
    );
    expect(parsed.messageUsage).toEqual({ messageId: 'msg_1', usage: { input: 2, output: 40, cacheRead: 900, cacheCreation: 100 } });
  });

  it('returns the final result with its cost and usage', () => {
    const parsed = parseStreamLine(
      line({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: 'All done.',
        total_cost_usd: 0.2,
        duration_ms: 12_400,
        num_turns: 3,
        usage: { input_tokens: 10, output_tokens: 125, cache_read_input_tokens: 51679, cache_creation_input_tokens: 17795 },
      }),
    );
    expect(parsed.final).toEqual({
      isError: false,
      text: 'All done.',
      costUsd: 0.2,
      usage: { input: 10, output: 125, cacheRead: 51679, cacheCreation: 17795 },
    });
    // The answer itself is already in the log as Claude's last message, so only a summary line is added.
    expect(parsed.lines).toEqual([{ kind: 'result', text: 'Finished in 12s · 3 turns · $0.20' }]);
  });

  it('treats a non-success result as an error', () => {
    const parsed = parseStreamLine(line({ type: 'result', subtype: 'error_max_turns', is_error: false }));
    expect(parsed.final?.isError).toBe(true);
    expect(parsed.lines[0]).toEqual({ kind: 'error', text: 'Run ended: error_max_turns' });
  });

  it('cuts very long text', () => {
    const parsed = parseStreamLine(line({ type: 'assistant', message: { content: [{ type: 'text', text: 'x'.repeat(MAX_LOG_TEXT + 10) }] } }));
    expect(parsed.lines[0]?.text.endsWith('… (cut)')).toBe(true);
  });

  it('ignores events it does not show and keeps non-JSON output as status', () => {
    expect(parseStreamLine(line({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed' } })).lines).toEqual([]);
    expect(parseStreamLine('plain warning').lines).toEqual([{ kind: 'status', text: 'plain warning' }]);
    expect(parseStreamLine('   ').lines).toEqual([]);
  });
});

describe('describeToolCall', () => {
  it('prefers the most telling input field', () => {
    expect(describeToolCall('Bash', { command: 'npm test', description: 'Run tests' })).toBe('Bash: npm test');
    expect(describeToolCall('TodoWrite', { todos: [] })).toBe('TodoWrite');
  });
});
