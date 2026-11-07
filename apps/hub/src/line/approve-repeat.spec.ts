import { describe, expect, it } from 'vitest';
import { approvedJustNow } from './approve-rule.js';

const now = Date.parse('2026-11-07T10:00:00Z');
const step = (over: Partial<{ status: string; kind: string; decidedBy: string | null; finishedAt: Date | null }>) => ({
  status: 'DONE',
  kind: 'CHECK',
  decidedBy: 'you',
  finishedAt: new Date(now - 30_000),
  ...over,
});

describe('approvedJustNow', () => {
  it('treats a second approve within two minutes as the same click', () => {
    expect(approvedJustNow([step({})], now)).toBe(true);
    expect(approvedJustNow([step({ kind: 'GATE' })], now)).toBe(true);
  });

  it('does not cover old approvals, work steps or steps a member finished', () => {
    expect(approvedJustNow([step({ finishedAt: new Date(now - 5 * 60_000) })], now)).toBe(false);
    expect(approvedJustNow([step({ kind: 'WORK' })], now)).toBe(false);
    expect(approvedJustNow([step({ decidedBy: null })], now)).toBe(false);
    expect(approvedJustNow([step({ status: 'SENT_BACK' })], now)).toBe(false);
  });
});
