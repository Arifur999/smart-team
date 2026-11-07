import { describe, expect, it } from 'vitest';
import { pickNextRun } from './queue-order.js';

const run = (id: string, taskId: string, created: number) => ({ id, taskId, taskCreatedAt: new Date(created) });

describe('pickNextRun', () => {
  it('lets the task that waited longest go next, so a long task does not starve the next one', () => {
    const queued = [run('a2', 'A', 1), run('b1', 'B', 2)];
    const lastEnded = new Map([
      ['A', new Date(5000)],
      ['B', new Date(1000)],
    ]);
    expect(pickNextRun(queued, lastEnded)?.id).toBe('b1');
  });

  it('starts a task that never ran before one that already did', () => {
    expect(pickNextRun([run('a2', 'A', 1), run('b1', 'B', 2)], new Map([['A', new Date(1)]]))?.id).toBe('b1');
  });

  it('keeps queue order inside one task and gives ties to the older task', () => {
    expect(pickNextRun([run('a1', 'A', 1), run('a2', 'A', 1), run('b1', 'B', 2)], new Map())?.id).toBe('a1');
  });

  it('returns null for an empty queue', () => {
    expect(pickNextRun([], new Map())).toBeNull();
  });
});
