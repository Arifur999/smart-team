/**
 * Where the browser finds the hub. Defaults to port 4000 on whatever host served the dashboard,
 * so opening the dashboard from another PC on the LAN still reaches the hub.
 */
export function hubUrl(): string {
  const configured = process.env.NEXT_PUBLIC_HUB_URL;
  if (configured) return configured;
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}
