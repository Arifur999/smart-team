import { timingSafeEqual } from 'node:crypto';

export function tokensMatch(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** socket.io reports IPv4 clients as "::ffff:192.168.0.5". */
export function normalizeIp(address: string | undefined): string | null {
  if (!address) return null;
  return address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address;
}
