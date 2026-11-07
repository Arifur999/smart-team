import { describe, expect, it } from 'vitest';
import { formatTimecode, parseAt } from './timecode';

describe('parseAt', () => {
  it.each([
    ['2.4', 2.4],
    ['8.6-9.2', 8.6],
    ['0:12', 12],
    ['1:02.5', 62.5],
    ['3s', 3],
    ['8.6 – 9.2', 8.6],
  ])('%s → %d s', (text, seconds) => expect(parseAt(text)).toBeCloseTo(seconds));

  it.each([undefined, '', 'intro', '1:2:3:4'])('%s → null', (text) => expect(parseAt(text)).toBeNull());
});

describe('formatTimecode', () => {
  it('shows minutes, seconds and tenths', () => {
    expect(formatTimecode(0)).toBe('0:00.0');
    expect(formatTimecode(6.1)).toBe('0:06.1');
    expect(formatTimecode(62.55)).toBe('1:02.5');
  });
});
