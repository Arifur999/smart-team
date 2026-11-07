import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseHouseRules } from '../line/house-rules.js';
import { appendRule, nextRuleId } from './rule-book.js';
import { parseDrafts } from './rules.service.js';

const dir = mkdtempSync(join(tmpdir(), 'rules-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('nextRuleId', () => {
  it('continues after the highest number in the scope', () => {
    expect(nextRuleId('## R-ED-001 a\n## R-ED-010 b\n## R-GL-020 c', 'R-ED')).toBe('R-ED-011');
    expect(nextRuleId('# empty', 'R-DV')).toBe('R-DV-001');
  });
});

describe('appendRule', () => {
  it('writes a rule the house-rules parser reads back as active', () => {
    const rule = { title: 'End card on white', applies: 'storyboard, animate', rule: 'The end card sits on a\nfull white flood.', why: 'Client note.', check: 'Mean luma >= 230.', source: 'task x' };
    expect(appendRule(dir, 'nextEditor', 'nextEditor', rule)).toBe('R-ED-001');
    expect(appendRule(dir, 'nextEditor', 'nextEditor', { ...rule, title: 'Second' })).toBe('R-ED-002');
    const parsed = parseHouseRules(readFileSync(join(dir, 'nextEditor.md'), 'utf8'));
    expect(parsed.map((r) => r.id)).toEqual(['R-ED-001', 'R-ED-002']);
    expect(parsed[0]).toMatchObject({ status: 'active', applies: ['storyboard', 'animate'], rule: 'The end card sits on a full white flood.', check: 'Mean luma >= 230.' });
  });
});

describe('parseDrafts', () => {
  it('reads a fenced JSON array and drops bad items', () => {
    const text = 'Here:\n```json\n[{"title":"T","applies":"animate","rule":"R","why":"W","check":null},{"title":""},{"rule":"no title"}]\n```';
    expect(parseDrafts(text)).toEqual([{ title: 'T', applies: 'animate', rule: 'R', why: 'W', check: null }]);
  });

  it('returns nothing for a reply without an array', () => {
    expect(parseDrafts('No rules worth keeping.')).toEqual([]);
    expect(parseDrafts('[not json')).toEqual([]);
  });
});
