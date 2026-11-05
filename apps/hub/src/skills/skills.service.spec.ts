import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readSkill } from './skills.service.js';

const root = mkdtempSync(join(tmpdir(), 'st-skills-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function makeSkill(name: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, name, path, '..'), { recursive: true });
    writeFileSync(join(root, name, path), content);
  }
  return join(root, name);
}

describe('readSkill', () => {
  it('reads a folder with SKILL.md, listing every file and hashing them into a version', () => {
    const dir = makeSkill('alpha', { 'SKILL.md': '# alpha', 'templates/a.txt': 'x' });
    const skill = readSkill(dir, 'alpha');
    expect(skill?.files.map((f) => f.replace(/\\/g, '/')).sort()).toEqual(['SKILL.md', 'templates/a.txt']);
    expect(skill?.version).toMatch(/^[a-f0-9]{12}$/);
  });

  it('changes the version when any file changes, and only then', () => {
    const dir = makeSkill('beta', { 'SKILL.md': '# beta' });
    const before = readSkill(dir, 'beta')!.version;
    expect(readSkill(dir, 'beta')!.version).toBe(before);
    writeFileSync(join(dir, 'SKILL.md'), '# beta v2');
    expect(readSkill(dir, 'beta')!.version).not.toBe(before);
  });

  it('skips folders without SKILL.md, plain files, missing paths and node_modules', () => {
    makeSkill('notes', { 'README.md': 'no skill here' });
    writeFileSync(join(root, 'loose.txt'), 'x');
    expect(readSkill(join(root, 'notes'), 'notes')).toBeNull();
    expect(readSkill(join(root, 'loose.txt'), 'loose')).toBeNull();
    expect(readSkill(join(root, 'nope'), 'nope')).toBeNull();

    const dir = makeSkill('gamma', { 'SKILL.md': '# g', 'node_modules/x/index.js': 'big' });
    expect(readSkill(dir, 'gamma')!.files).toEqual(['SKILL.md']);
  });
});
