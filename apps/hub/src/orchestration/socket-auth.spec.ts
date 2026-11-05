import { describe, expect, it } from 'vitest';
import { normalizeIp, tokensMatch } from './socket-auth.js';

describe('tokensMatch', () => {
  const secret = 'a'.repeat(32);

  it('accepts the exact token', () => {
    expect(tokensMatch(secret, secret)).toBe(true);
  });

  it('rejects a wrong, shorter or missing token', () => {
    expect(tokensMatch('b'.repeat(32), secret)).toBe(false);
    expect(tokensMatch('a', secret)).toBe(false);
    expect(tokensMatch(undefined, secret)).toBe(false);
    expect(tokensMatch(42, secret)).toBe(false);
  });
});

describe('normalizeIp', () => {
  it('strips the IPv4-mapped prefix', () => {
    expect(normalizeIp('::ffff:192.168.0.12')).toBe('192.168.0.12');
  });

  it('keeps plain addresses and handles missing ones', () => {
    expect(normalizeIp('::1')).toBe('::1');
    expect(normalizeIp(undefined)).toBeNull();
  });
});
