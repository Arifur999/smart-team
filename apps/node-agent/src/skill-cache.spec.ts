import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { safeJoin, SkillCache } from './skill-cache.js';

const root = mkdtempSync(join(tmpdir(), 'st-cache-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const b64 = (s: string) => Buffer.from(s).toString('base64');

function fakeHub(files: { path: string; base64: string }[]) {
  return vi.fn(async (url: string, init: { headers: Record<string, string> }) => ({
    ok: init.headers['x-agent-token'] === 'secret',
    status: 200,
    json: async () => ({ name: 'demo', version: 'abc123abc123', files, requested: url }),
  }));
}

describe('SkillCache', () => {
  it('downloads a skill once per version and reuses the cached copy', async () => {
    const fetch = fakeHub([{ path: 'SKILL.md', base64: b64('# demo') }, { path: 'ref/a.md', base64: b64('A') }]);
    const cache = new SkillCache('http://hub:4000', 'secret', root, fetch);
    const dir = await cache.ensure({ name: 'demo', version: 'abc123abc123' });

    expect(readFileSync(join(dir, 'SKILL.md'), 'utf8')).toBe('# demo');
    expect(readFileSync(join(dir, 'ref', 'a.md'), 'utf8')).toBe('A');
    await cache.ensure({ name: 'demo', version: 'abc123abc123' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe('http://hub:4000/api/skills/demo/bundle?version=abc123abc123');
  });

  it('builds a plugin folder with the run skills and removes it afterwards', async () => {
    const cache = new SkillCache('http://hub:4000', 'secret', root, fakeHub([{ path: 'SKILL.md', base64: b64('# demo') }]));
    const plugin = await cache.buildPlugin('run-1', [{ name: 'demo', version: 'abc123abc123' }]);

    expect(plugin).not.toBeNull();
    expect(JSON.parse(readFileSync(join(plugin!, '.claude-plugin', 'plugin.json'), 'utf8')).name).toBe('smart-team-skills');
    expect(existsSync(join(plugin!, 'skills', 'demo', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(plugin!, 'skills', 'demo', '.smart-team-complete'))).toBe(false);

    cache.removePlugin('run-1');
    expect(existsSync(plugin!)).toBe(false);
  });

  it('builds nothing for a run without skills', async () => {
    const cache = new SkillCache('http://hub:4000', 'secret', root, fakeHub([]));
    expect(await cache.buildPlugin('run-2', [])).toBeNull();
  });

  it('fails when the hub refuses the token', async () => {
    const cache = new SkillCache('http://hub:4000', 'wrong', root, fakeHub([]));
    await expect(cache.ensure({ name: 'demo', version: 'fff000fff000' })).rejects.toThrow('answered 200');
  });
});

describe('safeJoin', () => {
  it('keeps bundle paths inside the target folder', () => {
    expect(safeJoin(root, 'a/b.md')).toBe(join(root, 'a', 'b.md'));
    expect(() => safeJoin(root, '../escape.md')).toThrow('unsafe');
    expect(() => safeJoin(root, 'a/../../escape.md')).toThrow('unsafe');
    expect(() => safeJoin(root, join(root, 'abs.md'))).toThrow('unsafe');
  });
});
