// Contract between hub, node agents and the dashboard. Change both sides together.

export const AGENT_NAMESPACE = '/agents';
export const DASHBOARD_NAMESPACE = '/dashboard';

export const AgentEvents = {
  // agent -> hub
  register: 'agent:register',
  heartbeat: 'agent:heartbeat',
  runLog: 'run:log',
  runFinished: 'run:finished',
  // hub -> agent
  runStart: 'run:start',
  runCancel: 'run:cancel',
} as const;

export const DashboardEvents = {
  // hub -> dashboard
  devices: 'devices:snapshot',
  taskUpdated: 'task:updated',
  taskLog: 'task:log',
  // dashboard -> hub: join or leave the live log of one task
  watchTask: 'task:watch',
  unwatchTask: 'task:unwatch',
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

// ---- Tasks and runs ----

export type RunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type FinishedRunStatus = Extract<RunStatus, 'SUCCEEDED' | 'FAILED' | 'CANCELLED'>;

export const FINISHED_STATUSES: readonly RunStatus[] = ['SUCCEEDED', 'FAILED', 'CANCELLED'];

/** PLAN: read-only planning in Claude Code's plan mode. EXECUTE: doing the approved work. */
export type RunMode = 'PLAN' | 'EXECUTE';

/** A finished plan run becomes AWAITING_APPROVAL: nothing changes on the PC until you approve. */
export type TaskStatus = RunStatus | 'AWAITING_APPROVAL';

/** The plan agent's name in the dashboard and the office view. */
export const PLAN_AGENT_NAME = 'Maria Hill';

/**
 * prompt: the instruction you typed · text: what the agent says · tool: a tool call it makes
 * tool_result: what came back · status: progress notes · error: something went wrong · result: the final answer
 */
export type LogKind = 'prompt' | 'text' | 'tool' | 'tool_result' | 'status' | 'error' | 'result';
export const LOG_KINDS: readonly LogKind[] = ['prompt', 'text', 'tool', 'tool_result', 'status', 'error', 'result'];

export interface LogEntry {
  /** Increasing per run, so the dashboard can merge history and live events without duplicates. */
  seq: number;
  kind: LogKind;
  text: string;
  at: string;
}

/** The hub writes each run's instruction as seq 0; agents number their own lines from this. */
export const FIRST_AGENT_SEQ = 1;

export interface TerminalLine extends LogEntry {
  runId: string;
}

/** Longest text kept for one log entry; tool output beyond this is cut. */
export const MAX_LOG_TEXT = 4_000;

export interface CreateTaskInput {
  title: string;
  prompt: string;
  deviceId: string;
  /** Must be one of the device's shared folders, or inside one. */
  workDir: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  /** Mode of the newest run. */
  mode: RunMode;
  deviceId: string;
  deviceName: string;
  workDir: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** Claude's final answer, or why the run failed. */
  outcome: string | null;
  costUsd: number | null;
}

export interface TaskDetail extends TaskSummary {
  /** Every run's lines in order, as one terminal transcript. */
  lines: TerminalLine[];
  /** False while a run is queued or going; follow-up instructions wait until it ends. */
  canFollowUp: boolean;
  /** True when a plan is ready and waiting for your approval. */
  canApprove: boolean;
}

export interface FollowUpInput {
  prompt: string;
}

export interface TaskLogEvent {
  taskId: string;
  lines: TerminalLine[];
}

export interface RunStartPayload {
  runId: string;
  prompt: string;
  workDir: string;
  mode: RunMode;
  /** Continue this Claude Code session instead of starting a new one. */
  resumeSessionId?: string;
}

export interface RunCancelPayload {
  runId: string;
}

export interface RunLogPayload {
  runId: string;
  entries: LogEntry[];
}

export interface RunFinishedPayload {
  runId: string;
  status: FinishedRunStatus;
  outcome?: string;
  costUsd?: number;
  /** Claude Code's session id, so a follow-up can continue the same conversation. */
  sessionId?: string;
}
