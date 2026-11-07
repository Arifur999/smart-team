import { LINES, matchGlob, memberSkillKeys, normalizeTaskPath, validateLine } from '@smart-team/shared';
import { describe, expect, it } from 'vitest';

describe('line definitions', () => {
  it.each(LINES.map((l) => [l.key, l] as const))('%s is valid', (_key, line) => {
    expect(validateLine(line)).toEqual([]);
  });

  it('gives every member their role and own skill keys', () => {
    expect(memberSkillKeys('beast')).toEqual(['nextEditor.qa', 'nextEditor.beast']);
    expect(memberSkillKeys('captain-marvel')).toEqual(['final-qa', 'captain-marvel']);
    expect(memberSkillKeys('nobody')).toEqual([]);
  });
});

describe('matchGlob', () => {
  it('matches stars, double stars, question marks and alternatives', () => {
    expect(matchGlob('03-storyboard/v2/stills/*.png', '03-storyboard/v2/stills/F01.png')).toBe(true);
    expect(matchGlob('03-storyboard/v2/stills/*.png', '03-storyboard/v2/stills/sub/F01.png')).toBe(false);
    expect(matchGlob('critique/**/*.png', 'critique/v1/pairs/B04.png')).toBe(true);
    expect(matchGlob('critique/**/*.png', 'critique/sheet.png')).toBe(true);
    expect(matchGlob('04-renders/v?/film.mp4', '04-renders/v3/film.mp4')).toBe(true);
    expect(matchGlob('*.{png,jpg}', 'poster.jpg')).toBe(true);
  });

  it('ignores case only when asked (Windows)', () => {
    expect(matchGlob('film.mp4', 'Film.MP4')).toBe(false);
    expect(matchGlob('film.mp4', 'Film.MP4', true)).toBe(true);
  });
});

describe('normalizeTaskPath', () => {
  it('keeps clean relative paths with forward slashes', () => {
    expect(normalizeTaskPath('04-renders\\v1\\film.mp4')).toBe('04-renders/v1/film.mp4');
    expect(normalizeTaskPath('./critique//v1.json')).toBe('critique/v1.json');
  });

  it('refuses paths that leave the task folder', () => {
    for (const bad of ['../secret.txt', 'a/../../b', 'C:\\Windows\\x', '/etc/passwd', '\\\\server\\share', 'a\0b', '', 'a:b']) {
      expect(normalizeTaskPath(bad), bad).toBeNull();
    }
  });
});
