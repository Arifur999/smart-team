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

// ---- Teams and members ----

export type TeamId = 'nextDev' | 'nextEditor' | 'nextDesign' | 'NextMarketer';
export const TEAM_IDS: readonly TeamId[] = ['nextDev', 'nextEditor', 'nextDesign', 'NextMarketer'];

export type MemberRole =
  | 'manager'
  | 'final-qa'
  | 'intake'
  | 'command-bot'
  | 'planner'
  | 'leader'
  | 'worker'
  | 'reference'
  | 'qa';

export interface TeamMember {
  /** Stable key; names can change. */
  id: string;
  name: string;
  /** Job title shown under the name. */
  title: string;
  role: MemberRole;
}

export interface Team {
  id: TeamId;
  label: string;
  /** What the team does, in a few words. */
  focus: string;
  /** Accent colour for the team's members in the office. */
  color: string;
  members: TeamMember[];
}

/** Agents above the teams. They appear in every team's office. */
export const LEADERSHIP: TeamMember[] = [
  { id: 'nick-fury', name: 'Nick Fury', title: 'Manager', role: 'manager' },
  { id: 'maria-hill', name: PLAN_AGENT_NAME, title: 'Plan agent', role: 'planner' },
  { id: 'captain-marvel', name: 'Captain Marvel', title: 'Final QA', role: 'final-qa' },
  { id: 'friday', name: 'Friday', title: 'Intake agent', role: 'intake' },
  { id: 'jarvis', name: 'Jarvis', title: 'Command bot', role: 'command-bot' },
];

/** The member a run is credited to. Plans go to the plan agent; approved work to the team's first worker until Team Leaders assign work (phase 5). */
export function runAgentId(team: TeamId, mode: RunMode): string {
  if (mode === 'PLAN') return 'maria-hill';
  const members = TEAMS.find((t) => t.id === team)?.members ?? [];
  return (members.find((m) => m.role === 'worker') ?? members[0])!.id;
}

/** Time and tokens one member has spent, across all their runs. */
export interface AgentStats {
  agentId: string;
  runs: number;
  /** Seconds spent in runs, including the one going now. */
  activeSeconds: number;
  usage: TokenUsage;
  costUsd: number;
  /** When the member's current run started; null when idle. */
  currentRunStartedAt: string | null;
}

export const TEAMS: Team[] = [
  {
    id: 'nextDev',
    label: 'nextDev',
    focus: 'Development',
    color: '#e0533d',
    members: [
      { id: 'iron-man', name: 'Iron Man', title: 'Team Leader', role: 'leader' },
      { id: 'hulk', name: 'Hulk', title: 'Developer', role: 'worker' },
      { id: 'spider-man', name: 'Spider-Man', title: 'Developer', role: 'worker' },
      { id: 'black-panther', name: 'Black Panther', title: 'Developer', role: 'worker' },
      { id: 'vision', name: 'Vision', title: 'Team QA', role: 'qa' },
    ],
  },
  {
    id: 'nextEditor',
    label: 'nextEditor',
    focus: 'Video editing',
    color: '#a855f7',
    members: [
      { id: 'cyclops', name: 'Cyclops', title: 'Team Leader', role: 'leader' },
      { id: 'storm', name: 'Storm', title: 'Editor', role: 'worker' },
      { id: 'jean-grey', name: 'Jean Grey', title: 'Editor', role: 'worker' },
      { id: 'wolverine', name: 'Wolverine', title: 'Reference Matcher', role: 'reference' },
      { id: 'beast', name: 'Beast', title: 'Team QA', role: 'qa' },
    ],
  },
  {
    id: 'nextDesign',
    label: 'nextDesign',
    focus: 'Design',
    color: '#14b8a6',
    members: [
      { id: 'mister-fantastic', name: 'Mister Fantastic', title: 'Team Leader', role: 'leader' },
      { id: 'invisible-woman', name: 'Invisible Woman', title: 'UI/UX Designer', role: 'worker' },
      { id: 'human-torch', name: 'Human Torch', title: 'Brand Designer', role: 'worker' },
      { id: 'silver-surfer', name: 'Silver Surfer', title: 'Reference Matcher', role: 'reference' },
      { id: 'the-thing', name: 'The Thing', title: 'Team QA', role: 'qa' },
    ],
  },
  {
    id: 'NextMarketer',
    label: 'NextMarketer',
    focus: 'Marketing',
    color: '#f59e0b',
    members: [
      { id: 'superman', name: 'Superman', title: 'Team Leader', role: 'leader' },
      { id: 'lois-lane', name: 'Lois Lane', title: 'Researcher', role: 'worker' },
      { id: 'flash', name: 'Flash', title: 'Copywriter', role: 'worker' },
      { id: 'aquaman', name: 'Aquaman', title: 'Content Creator', role: 'worker' },
      { id: 'green-lantern', name: 'Green Lantern', title: 'SEO / Ads', role: 'worker' },
      { id: 'martian-manhunter', name: 'Martian Manhunter', title: 'Team QA', role: 'qa' },
    ],
  },
];

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
  team: TeamId;
  title: string;
  prompt: string;
  deviceId: string;
  /** Must be one of the device's shared folders, or inside one. */
  workDir: string;
}

export interface TaskSummary {
  id: string;
  team: TeamId;
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

/** Tokens one run has used so far. Always a running total, never a delta. */
export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export const totalTokens = (u: TokenUsage) => u.input + u.output + u.cacheRead + u.cacheCreation;

export interface RunLogPayload {
  runId: string;
  entries: LogEntry[];
  /** Sent when the total changed since the last batch, so the office can show tokens while a run goes. */
  usage?: TokenUsage;
}

export interface RunFinishedPayload {
  runId: string;
  status: FinishedRunStatus;
  outcome?: string;
  costUsd?: number;
  usage?: TokenUsage;
  /** Claude Code's session id, so a follow-up can continue the same conversation. */
  sessionId?: string;
}
