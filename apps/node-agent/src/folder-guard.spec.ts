import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveAllowedDir } from './folder-guard.js';

const base = mkdtempSync(join(tmpdir(), 'st-guard-'));
const shared = join(base, 'shared');
const inner = join(shared, 'app');
const outside = join(base, 'private');
mkdirSync(inner, { recursive: true });
mkdirSync(outside);

afterAll(() => rmSync(base, { recursive: true, force: true }));

describe('resolveAllowedDir', () => {
  it('allows the shared folder and folders inside it', () => {
    expect(resolveAllowedDir(shared, [shared])).not.toBeNull();
    expect(resolveAllowedDir(inner, [shared])).not.toBeNull();
  });

  it('refuses folders outside, ".." escapes and missing paths', () => {
    expect(resolveAllowedDir(outside, [shared])).toBeNull();
    expect(resolveAllowedDir(join(shared, '..', 'private'), [shared])).toBeNull();
    expect(resolveAllowedDir(join(shared, 'nope'), [shared])).toBeNull();
  });

  it('follows links before deciding', () => {
    // A link inside the shared folder that points outside resolves to the outside path.
    const fakeRealpath = (p: string) => (p === join(shared, 'link') ? outside : p);
    expect(resolveAllowedDir(join(shared, 'link'), [shared], fakeRealpath)).toBeNull();
  });
});
