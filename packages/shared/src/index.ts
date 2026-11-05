// Contract between hub, node agents and the dashboard. Change both sides together.

export const AGENT_NAMESPACE = '/agents';
export const DASHBOARD_NAMESPACE = '/dashboard';

export const AgentEvents = {
  register: 'agent:register',
  heartbeat: 'agent:heartbeat',
} as const;

export const DashboardEvents = {
  devices: 'devices:snapshot',
} as const;

/** Agents beat every HEARTBEAT_MS; the hub marks a device offline after OFFLINE_AFTER_MS of silence. */
export const HEARTBEAT_MS = 3_000;
export const OFFLINE_AFTER_MS = 10_000;

export type ResourceKind = 'TOOL' | 'FOLDER';

export interface ResourceInfo {
  kind: ResourceKind;
  name: string;
  /** Folder path on that PC; tools leave it empty. */
  path?: string;
  version?: string;
  /** Free tags the manager routes on, e.g. "sfx", "vfx-reference", "node". */
  tags: string[];
}

export interface RegisterPayload {
  name: string;
  hostname: string;
  platform: string;
  agentVersion: string;
  resources: ResourceInfo[];
}

export type DeviceStatus = 'ONLINE' | 'OFFLINE';

export interface DeviceView {
  id: string;
  name: string;
  hostname: string;
  ip: string | null;
  platform: string;
  agentVersion: string;
  status: DeviceStatus;
  lastSeenAt: string;
  resources: ResourceInfo[];
}
