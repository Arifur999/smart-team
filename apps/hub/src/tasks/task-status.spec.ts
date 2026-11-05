import { describe, expect, it } from 'vitest';
import { taskStatus } from './tasks.service.js';

describe('taskStatus', () => {
  it('turns a finished plan into a plan waiting for approval', () => {
    expect(taskStatus({ mode: 'PLAN', status: 'SUCCEEDED' })).toBe('AWAITING_APPROVAL');
  });

  it('keeps every other state as the run state', () => {
    expect(taskStatus({ mode: 'PLAN', status: 'RUNNING' })).toBe('RUNNING');
    expect(taskStatus({ mode: 'PLAN', status: 'FAILED' })).toBe('FAILED');
    expect(taskStatus({ mode: 'EXECUTE', status: 'SUCCEEDED' })).toBe('SUCCEEDED');
    expect(taskStatus({ mode: 'EXECUTE', status: 'QUEUED' })).toBe('QUEUED');
  });
});
