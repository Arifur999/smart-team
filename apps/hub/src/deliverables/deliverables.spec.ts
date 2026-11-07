import { describe, expect, it } from 'vitest';

// The service's module reads the hub env when Nest decorators load.
process.env.DATABASE_URL ??= 'postgresql://test@localhost:5432/test';
process.env.AGENT_TOKEN ??= 'test-token-test-token-test-token';
const { fileType, versionOf } = await import('./deliverables.service.js');

describe('deliverable files', () => {
  it('decides content type and inline display from the extension only', () => {
    expect(fileType('04-renders/v2/film.MP4')).toMatchObject({ mime: 'video/mp4', kind: 'VIDEO', inline: true });
    expect(fileType('logo.svg')).toMatchObject({ kind: 'IMAGE', inline: false });
    expect(fileType('notes.exe')).toMatchObject({ mime: 'application/octet-stream', kind: 'OTHER', inline: false });
  });

  it('reads the render version from the path', () => {
    expect(versionOf('04-renders/v2/film.mp4')).toBe(2);
    expect(versionOf('critique/v3/pairs/B04.png')).toBe(3);
    expect(versionOf('critique/v1.json')).toBe(1);
    expect(versionOf('01-source/ref.mp4')).toBeNull();
  });
});
