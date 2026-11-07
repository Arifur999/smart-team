import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

// The dispatcher's imports read the hub env when their decorators load.
process.env.DATABASE_URL ??= 'postgresql://test@localhost:5432/test';
process.env.AGENT_TOKEN ??= 'test-token-test-token-test-token';
const { RunDispatcher } = await import('./run-dispatcher.js');

function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`still waiting after ${ms} ms`)), ms))]);
}

function fakeDispatcher(sendResults: boolean[]) {
  const queue = ['r1', 'r2'].map((id) => ({ id, taskId: 't1', team: 'nextEditor', prompt: 'p', workDir: 'w', mode: 'EXECUTE' }));
  const sent: string[] = [];
  const tasks = {
    claimNextQueued: async () => queue.shift() ?? null,
    finish: async () => true,
    newestRun: async () => ({ deviceId: 'd1' }),
    summary: async () => ({}),
  };
  const agents = {
    isConnected: () => true,
    send: (_device: string, _event: string, payload: { runId: string }) => {
      const ok = sendResults.shift() ?? true;
      if (ok) sent.push(payload.runId);
      return ok;
    },
  };
  const dispatcher = new RunDispatcher(
    tasks as never,
    agents as never,
    { pushTask: () => {} } as never,
    { reload: () => {}, forRun: () => [] } as never,
    { forRun: async () => [] } as never,
  );
  return { dispatcher, sent };
}

describe('RunDispatcher', () => {
  it('lets a run-ended listener queue and dispatch the next run when sending fails', async () => {
    const { dispatcher, sent } = fakeDispatcher([false, true]);
    const ended: string[] = [];
    dispatcher.onRunEnded(async ({ runId }) => {
      ended.push(runId);
      await dispatcher.queued('t1');
    });

    await within(dispatcher.dispatch('d1'), 1000);
    expect(ended).toEqual(['r1']);
    expect(sent).toEqual(['r2']);
  });
});
