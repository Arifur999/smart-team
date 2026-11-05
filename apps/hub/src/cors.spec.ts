import { describe, expect, it } from 'vitest';
import { corsOrigin, isPrivateOrigin } from './cors.js';

describe('isPrivateOrigin', () => {
  it('lets in this PC, the LAN and Tailscale', () => {
    for (const origin of [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://[::1]:3000',
      'http://192.168.0.238:3000',
      'http://10.0.0.5:3000',
      'http://172.20.1.2:3000',
      'http://100.101.102.103:3000',
      'http://hub-pc.tail1234.ts.net:3000',
      'http://hub-pc.local:3000',
    ]) {
      expect(isPrivateOrigin(origin), origin).toBe(true);
    }
  });

  it('keeps public websites out', () => {
    for (const origin of ['https://example.com', 'http://8.8.8.8', 'http://172.32.0.1:3000', 'http://100.128.0.1', 'http://localhost.evil.com', 'not a url']) {
      expect(isPrivateOrigin(origin), origin).toBe(false);
    }
  });
});

describe('corsOrigin', () => {
  it('reads a list of origins', () => {
    expect(corsOrigin('http://a:3000, http://b:3000')).toEqual(['http://a:3000', 'http://b:3000']);
  });
});
