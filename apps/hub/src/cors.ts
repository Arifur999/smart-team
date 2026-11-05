import { isIP } from 'node:net';

type OriginCheck = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void;

/**
 * Which web pages may call the hub from a browser, from DASHBOARD_ORIGIN.
 * "private" (the default) lets in a dashboard opened from this PC, the LAN or Tailscale, so a phone at
 * http://192.168.0.10:3000 works, and keeps public websites out. Otherwise: a comma-separated list of origins.
 */
export function corsOrigin(setting: string): OriginCheck | string[] {
  if (setting.trim() !== 'private') return setting.split(',').map((o) => o.trim()).filter(Boolean);
  return (origin, callback) => callback(null, origin === undefined || isPrivateOrigin(origin));
}

export function isPrivateOrigin(origin: string): boolean {
  let host: string;
  try {
    host = new URL(origin).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return false;
  }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.ts.net')) return true;
  if (isIP(host) === 6) return host === '::1' || /^f[cd]/i.test(host);
  if (isIP(host) !== 4) return false;
  const [a = 0, b = 0] = host.split('.').map(Number);
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    // Tailscale gives each device an address in 100.64.0.0/10.
    (a === 100 && b >= 64 && b <= 127)
  );
}
