import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunAsset } from '@smart-team/shared';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { AssetCache, safeFileName } from './asset-cache.js';

const root = mkdtempSync(join(tmpdir(), 'st-assets-'));
const shared = join(root, 'shared');
mkdirSync(join(shared, 'refs'), { recursive: true });
writeFileSync(join(shared, 'refs', 'look.png'), 'png');
afterAll(() => rmSync(root, { recursive: true, force: true }));

const base: RunAsset = { id: 'a1', kind: 'UPLOAD', name: 'clip.mp4', tag: 'raw-footage', fieldLabel: 'Raw footage', path: null, deviceId: null, deviceName: null, url: null };

function fakeHub(body: string) {
  return vi.fn(async () => ({ ok: true, status: 200, body: new Blob([body]).stream() }));
}

describe('AssetCache.prepare', () => {
  it('downloads uploads once and points Claude at the cached file', async () => {
    const fetch = fakeHub('video-bytes');
    const cache = new AssetCache('http://hub:4000', 'secret', join(root, 'cache'), () => 'pc-1', () => [shared], fetch);
    const first = await cache.prepare([base], 'PLAN');
    await cache.prepare([base], 'EXECUTE');

    expect(fetch).toHaveBeenCalledTimes(1);
    const path = join(root, 'cache', 'assets', 'a1', 'clip.mp4');
    expect(readFileSync(path, 'utf8')).toBe('video-bytes');
    expect(first.addDirs).toEqual([join(root, 'cache', 'assets', 'a1')]);
    expect(first.promptSuffix).toContain(`- Raw footage [raw-footage]: ${path}`);
  });

  it('lists uploads without downloading them for the brief check', async () => {
    const fetch = fakeHub('x');
    const cache = new AssetCache('http://hub:4000', 'secret', join(root, 'cache2'), () => 'pc-1', () => [shared], fetch);
    const prepared = await cache.prepare([base], 'INTAKE');
    expect(fetch).not.toHaveBeenCalled();
    expect(prepared.promptSuffix).toContain('uploaded file clip.mp4');
  });

  it('opens folders on this PC, and only notes folders on other PCs and links', async () => {
    const cache = new AssetCache('http://hub:4000', 'secret', join(root, 'cache3'), () => 'pc-1', () => [shared], fakeHub(''));
    const prepared = await cache.prepare(
      [
        { ...base, id: 'p1', kind: 'PATH', name: 'refs', path: join(shared, 'refs'), deviceId: 'pc-1', deviceName: 'PC-1', fieldLabel: 'VFX references' },
        { ...base, id: 'p2', kind: 'PATH', name: 'sfx', path: 'D:\\sfx', deviceId: 'pc-2', deviceName: 'PC-2', fieldLabel: 'Music and sound' },
        { ...base, id: 'l1', kind: 'LINK', name: 'ref', url: 'https://example.com/ref', fieldLabel: 'VFX references' },
      ],
      'PLAN',
    );
    expect(prepared.addDirs).toEqual([join(shared, 'refs')]);
    expect(prepared.promptSuffix).toContain('on PC PC-2 (not reachable from this PC yet)');
    expect(prepared.promptSuffix).toContain('link https://example.com/ref');
  });

  it('adds nothing when the brief has no files', async () => {
    const cache = new AssetCache('http://hub:4000', 'secret', join(root, 'cache4'), () => 'pc-1', () => [shared], fakeHub(''));
    expect(await cache.prepare([], 'PLAN')).toEqual({ addDirs: [], promptSuffix: '' });
  });
});

describe('safeFileName', () => {
  it('keeps names readable but safe', () => {
    expect(safeFileName('my clip.mp4')).toBe('my clip.mp4');
    // Separators become underscores, so the result is always one file name inside the cache folder.
    expect(safeFileName('../../evil.sh')).toBe('__.._evil.sh');
    expect(safeFileName('a:b*c?.png')).toBe('a_b_c_.png');
    expect(safeFileName('')).toBe('file');
  });
});
