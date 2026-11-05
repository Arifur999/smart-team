import { describe, expect, it } from 'vitest';
import { folderResources, parseVersion } from './resources.js';

describe('parseVersion', () => {
  it('reads versions from common tool output', () => {
    expect(parseVersion('v24.15.0')).toBe('24.15.0');
    expect(parseVersion('git version 2.47.1.windows.1')).toBe('2.47.1');
    expect(parseVersion('Docker version 29.3.1, build c2be9cc')).toBe('29.3.1');
    expect(parseVersion('2.1.220 (Claude Code)')).toBe('2.1.220');
  });

  it('returns undefined when there is no version', () => {
    expect(parseVersion('command not found')).toBeUndefined();
  });
});

describe('folderResources', () => {
  it('keeps existing folders with their tags and skips missing ones', () => {
    const folders = [
      { name: 'SFX', path: 'D:\\media\\sfx', tags: ['sfx'] },
      { name: 'Gone', path: 'D:\\nope', tags: [] },
    ];
    const result = folderResources(folders, (path) => path === 'D:\\media\\sfx');
    expect(result).toEqual([{ kind: 'FOLDER', name: 'SFX', path: 'D:\\media\\sfx', tags: ['sfx'] }]);
  });
});
