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
  botMessage: 'bot:message',
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

/**
 * INTAKE: the intake agent checks the brief, read-only. PLAN: read-only planning in Claude Code's plan mode.
 * EXECUTE: doing the approved work.
 */
export type RunMode = 'INTAKE' | 'PLAN' | 'EXECUTE';

/**
 * INTAKE: the brief is still being collected or checked; nothing is planned yet.
 * A finished plan run becomes AWAITING_APPROVAL: nothing changes on the PC until you approve.
 */
export type TaskStatus = 'INTAKE' | RunStatus | 'AWAITING_APPROVAL';

/** The intake agent's name in the dashboard and the office view. */
export const INTAKE_AGENT_NAME = 'Friday';

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
  if (mode === 'INTAKE') return 'friday';
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

/** Longest final answer an agent sends back. Agents keep the start and the end, where reports put their JSON. */
export const MAX_OUTCOME_CHARS = 20_000;

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
  /** Mode of the newest run; INTAKE before any run exists. */
  mode: RunMode;
  /** Where the brief stands; null for tasks from before intake existed. */
  intakePhase: IntakePhase | null;
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

// ---- Skill packs ----

/** A skill pinned to the exact content the hub has: the version is a hash of its files. */
export interface SkillRef {
  name: string;
  version: string;
}

export interface SkillBundle extends SkillRef {
  files: { path: string; base64: string }[];
}

/** One role's skills as the dashboard shows them; version is null when the hub cannot find the skill. */
export interface RoleSkills {
  role: string;
  skills: { name: string; version: string | null }[];
}

/** Header agents send to download skill bundles over HTTP. */
export const AGENT_TOKEN_HEADER = 'x-agent-token';

/** The skill pack key of a team member: "planner" for the plan agent, otherwise "<team>.<role>". */
export function skillRoleKey(team: TeamId | null, role: MemberRole): string {
  return role === 'planner' || !team ? role : `${team}.${role}`;
}

// ---- Intake: briefs, files and Friday's questions ----

/**
 * text / longtext: a typed answer. files: uploads, folders on a PC or links, with an optional note.
 * The tag is attached to every file given for the field, so team leaders can route work by it.
 */
export interface IntakeField {
  id: string;
  label: string;
  /** How Friday asks for it. */
  question: string;
  kind: 'text' | 'longtext' | 'files';
  required: boolean;
  tag?: string;
}

export type AssetKind = 'UPLOAD' | 'PATH' | 'LINK';

export interface AssetView {
  id: string;
  fieldId: string;
  kind: AssetKind;
  name: string;
  tag: string | null;
  /** PATH: the folder or file on that PC. */
  path: string | null;
  deviceId: string | null;
  deviceName: string | null;
  /** LINK only. */
  url: string | null;
  size: number | null;
}

export interface IntakeMessageView {
  id: string;
  from: 'FRIDAY' | 'YOU';
  text: string;
  at: string;
}

/**
 * ASKING: Friday is going through the template. REVIEWING: Claude is checking the brief.
 * CLARIFYING: Friday asked follow-up questions. READY: summary shown, waiting for you to confirm.
 * LOCKED: confirmed; planning has started.
 */
export type IntakePhase = 'ASKING' | 'REVIEWING' | 'CLARIFYING' | 'READY' | 'LOCKED';

export interface IntakeView {
  taskId: string;
  phase: IntakePhase;
  fields: (IntakeField & { answer: string | null; skipped: boolean; assets: AssetView[] })[];
  /** The field Friday is asking about now; null when not asking. */
  currentFieldId: string | null;
  messages: IntakeMessageView[];
  /** The brief Friday will hand to the planner, once checked. */
  summary: string | null;
}

export interface IntakeAnswerInput {
  text: string;
}

export interface AddPathAssetInput {
  fieldId: string;
  deviceId: string;
  path: string;
}

export interface AddLinkAssetInput {
  fieldId: string;
  url: string;
}

/** Shared by every team: the work itself and what done looks like. */
const BASE_FIELDS = {
  goal: { id: 'goal', label: 'Goal', question: 'What should be done? Describe the goal in a few sentences.', kind: 'longtext', required: true },
  done: {
    id: 'done',
    label: 'Done when',
    question: 'How will we know it is done? List what must be true at the end.',
    kind: 'longtext',
    required: true,
  },
  deadline: { id: 'deadline', label: 'Deadline', question: 'Is there a deadline?', kind: 'text', required: false },
} satisfies Record<string, IntakeField>;

/** What Friday collects for each team before anything is planned. */
export const INTAKE_TEMPLATES: Record<TeamId, IntakeField[]> = {
  nextDev: [
    BASE_FIELDS.goal,
    { id: 'area', label: 'Where in the project', question: 'Which part of the project does this touch (app, module, page)?', kind: 'text', required: false },
    { id: 'stack', label: 'Stack', question: 'Which stack or libraries should be used, if it matters?', kind: 'text', required: false },
    { id: 'designs', label: 'Designs', question: 'Any designs, screenshots or Figma links to follow?', kind: 'files', required: false, tag: 'design' },
    { id: 'docs', label: 'API docs', question: 'Any API docs or specs the work depends on?', kind: 'files', required: false, tag: 'docs' },
    BASE_FIELDS.done,
    { id: 'avoid', label: 'Do not touch', question: 'Is there anything that must not change?', kind: 'longtext', required: false },
    BASE_FIELDS.deadline,
  ],
  nextEditor: [
    BASE_FIELDS.goal,
    { id: 'platform', label: 'Platform', question: 'Where will the video go: Reel, Short, YouTube, an ad, something else?', kind: 'text', required: true },
    { id: 'format', label: 'Length and format', question: 'How long should it be, and which aspect ratio?', kind: 'text', required: true },
    { id: 'footage', label: 'Raw footage', question: 'Please share the raw footage.', kind: 'files', required: true, tag: 'raw-footage' },
    { id: 'vfx', label: 'VFX references', question: 'Share the VFX or editing style references you want matched.', kind: 'files', required: true, tag: 'vfx-reference' },
    { id: 'images', label: 'Reference images', question: 'Any reference images or a mood board?', kind: 'files', required: false, tag: 'image' },
    { id: 'audio', label: 'Music and sound', question: 'Music and sound effects to use?', kind: 'files', required: false, tag: 'music' },
    { id: 'brand', label: 'Brand', question: 'Logo, colours or fonts to use?', kind: 'files', required: false, tag: 'brand' },
    { id: 'captions', label: 'Captions', question: 'Do you want captions? In which language and style?', kind: 'text', required: false },
    BASE_FIELDS.done,
    BASE_FIELDS.deadline,
  ],
  nextDesign: [
    BASE_FIELDS.goal,
    { id: 'audience', label: 'Audience', question: 'Who is this for?', kind: 'text', required: true },
    { id: 'references', label: 'References', question: 'Share designs or screenshots you like.', kind: 'files', required: true, tag: 'design-reference' },
    { id: 'brand', label: 'Brand', question: 'Any existing logo, colours or fonts? Say "none" if there is no brand yet.', kind: 'files', required: false, tag: 'brand' },
    { id: 'dislikes', label: 'Avoid', question: 'Anything you do not like or want to avoid?', kind: 'longtext', required: false },
    { id: 'formats', label: 'Sizes and formats', question: 'Which sizes and formats do you need (Figma, PNG, SVG, Canva)?', kind: 'text', required: true },
    { id: 'copy', label: 'Text', question: 'Any text that must appear in the design?', kind: 'longtext', required: false },
    BASE_FIELDS.done,
    BASE_FIELDS.deadline,
  ],
  NextMarketer: [
    BASE_FIELDS.goal,
    { id: 'product', label: 'Product', question: 'What product or service is this about?', kind: 'longtext', required: true },
    { id: 'customer', label: 'Customer', question: 'Who is the target customer?', kind: 'text', required: true },
    { id: 'competitors', label: 'Competitors', question: 'Who are the main competitors?', kind: 'text', required: false },
    { id: 'objective', label: 'Objective', question: 'What is the main goal: sales, leads, followers or awareness?', kind: 'text', required: true },
    { id: 'platforms', label: 'Platforms', question: 'Which platforms: Facebook, Instagram, YouTube, TikTok, Google, email?', kind: 'text', required: true },
    { id: 'budget', label: 'Budget', question: 'What is the budget?', kind: 'text', required: false },
    { id: 'tone', label: 'Tone', question: 'What tone should the copy have?', kind: 'text', required: false },
    { id: 'brand', label: 'Brand assets', question: 'Any brand assets to use?', kind: 'files', required: false, tag: 'brand' },
    { id: 'history', label: 'Past results', question: 'How did past campaigns do?', kind: 'longtext', required: false },
    BASE_FIELDS.done,
    BASE_FIELDS.deadline,
  ],
};

/** A file a run needs. The agent downloads uploads; folders on its own PC are opened to Claude directly. */
export interface RunAsset {
  id: string;
  kind: AssetKind;
  name: string;
  tag: string | null;
  fieldLabel: string;
  path: string | null;
  deviceId: string | null;
  deviceName: string | null;
  url: string | null;
}

export interface RunStartPayload {
  runId: string;
  prompt: string;
  workDir: string;
  mode: RunMode;
  /** Skills to load for this run; the agent downloads any it does not have cached. */
  skills: SkillRef[];
  /** Files from the brief; the agent makes them available and lists them for Claude. */
  assets: RunAsset[];
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

// ---- Command bot ----

/** The command bot's name in the office (the "command-bot" member). */
export const BOT_NAME = 'Jarvis';

export type BotRole = 'YOU' | 'BOT';

/** Something the bot did, or wants you to confirm, shown as a card under its message. */
export type BotAction =
  | { kind: 'task-created'; id: string; taskId: string; team: TeamId; title: string }
  | {
      kind: 'confirm';
      id: string;
      /** cancel: stop the task. approve: carry out its plan. instruct: send `text` to the task's Claude session. */
      action: 'cancel' | 'approve' | 'instruct';
      taskId: string;
      title: string;
      text?: string;
      /** Null until you answer. */
      answer: 'confirmed' | 'declined' | null;
      /** Why it could not be done, if it failed after you confirmed. */
      error?: string;
    };

export interface BotMessageView {
  id: string;
  role: BotRole;
  text: string;
  /** The team the message was about (an @mention or the selected team), if any. */
  team: TeamId | null;
  actions: BotAction[];
  at: string;
}

export interface BotStatus {
  /** False when the hub has no Claude API key. */
  enabled: boolean;
  model: string;
}

export interface BotSendInput {
  text: string;
  /** The team picked in the bot panel, if any. */
  team?: TeamId | null;
}

/** Finds `@team` mentions (case-insensitive, e.g. "@nextdev") in a message. */
export function mentionedTeams(text: string): TeamId[] {
  const found = new Set<TeamId>();
  for (const match of text.matchAll(/@([A-Za-z]+)/g)) {
    const team = TEAM_IDS.find((id) => id.toLowerCase() === match[1]!.toLowerCase());
    if (team) found.add(team);
  }
  return [...found];
}