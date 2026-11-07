import { DESIGN_LINE, DEV_LINE, MARKETING_LINE } from './lines-teams.js';
// Production lines: each team's work as a row of stages, each run by one member. Re-exported from index.ts.
import { LEADERSHIP, TEAMS, type MemberRole, type TeamId, type TeamMember } from './teams.js';

/** The owner of the stages where you act: the brief, your checks and the final review. */
export const YOU = 'you';

/** A working stage with no sign of life (no new tokens) for this long shows as stuck. */
export const STUCK_AFTER_MS = 15 * 60_000;

/** work: a member makes something. gate: a member judges it and may send it back. check: you decide. */
export type StageKind = 'work' | 'gate' | 'check';
/** plan: Claude Code plan mode (reads only). review: may run commands but not edit files. write: full access. */
export type StageAccess = 'plan' | 'review' | 'write';
/** match: copy the reference's style closely. concept: a new idea in the same spirit. */
export type LineDirection = 'match' | 'concept';

/** Your choices for one task on a line. Defaults come from the line. */
export interface LineSettings {
  direction: LineDirection;
  /** Trust the team: your checks marked trustSkips are skipped. The final review never is. */
  trust: boolean;
  /** Score out of 100 the main gate needs. */
  passMark: number;
  /** How many times the main gate may send work back before it goes on with known issues. */
  maxFixes: number;
  /** Skippable stages you turned off. */
  skipStages: string[];
  /** Optional checks you turned on. */
  extraChecks: string[];
}

/** Files a stage uploads for the Review Booth, as globs relative to the task folder. */
export interface DeliverableSpec {
  glob: string;
  label?: string;
  maxFiles?: number;
}

/** P0 must be fixed before anything passes; P1 should be; P2 is polish. */
export type FixSeverity = 'P0' | 'P1' | 'P2';

/** One thing to change, routed to the stage that can change it. */
export interface FixNote {
  id: string;
  severity: FixSeverity;
  stage: string;
  /** Time in the film, e.g. "2.4" or "8.6-9.2". */
  at?: string;
  scene?: string;
  problem: string;
  fix: string;
  evidence?: string;
  /** Who asked: a member id, or YOU. */
  from: string;
}

/** A gate's judgement, as the hub reads it (scores recomputed by the hub, never taken on trust). */
export interface Verdict {
  /** Out of 100 for scored gates; null for pass/fail gates without a score. */
  score: number | null;
  pass: boolean;
  summary: string;
  fixes: FixNote[];
  /** Dimension scores out of 10, by id (light, type, timing, …). */
  dimensions: Record<string, number>;
  mustPass: { id: string; ok: boolean }[];
  /** Set when the score the member wrote differs from the hub's own sum. */
  scoreMismatch?: { reported: number; computed: number };
}

export interface GateDef {
  /** score: the hub scores the verdict's rubric against the pass mark. flag: the verdict's own pass/fail. */
  judge: 'score' | 'flag';
  /** Rubric weights for scored gates. */
  rubric?: Rubric;
  /** The line's main gate: its pass mark and fix budget come from your settings. */
  main?: true;
  /** Fix budget for gates other than the main one. */
  maxFixes?: number;
  /** Lowest score a scored dimension may have (0-10); for flag gates it applies to listed dimensions. */
  minDimension?: number;
  /** Earlier work stages a fix may go back to. */
  fixTargets: string[];
  /** Where a fix with a missing or unknown stage goes. */
  defaultFix: string;
  /** Label of the send-back loop on the Production Line board. */
  loopLabel: string;
}

/** Brief answers that switch a skippable stage off, worked out by the hub. */
export type SkipWhen = 'no-sound' | 'single-format' | 'no-social' | 'no-search';

export interface StageDef {
  key: string;
  label: string;
  /** Member id, or YOU. */
  owner: string;
  kind: StageKind;
  access?: StageAccess;
  /** Extra skill keys on top of the owner's own. */
  skills?: string[];
  /** The stage's own folder in the task folder; {round} is this stage's round, {v} the current render version. */
  dir?: string;
  /** Write scope besides dir (other stages' folders this stage may change, e.g. the shared build/ project). */
  writes?: string[];
  /** Where the agent saves the stage's final reply. */
  saveReply?: string;
  /** Files that must exist (non-empty) when the run ends, relative to the task folder. */
  requiredFiles?: string[];
  deliverables?: DeliverableSpec[];
  /** The brief chat: done by Friday before the line starts. */
  intake?: true;
  /** The last check: approving it finishes the task. */
  final?: true;
  /** Skipped when you turn Trust on. */
  trustSkips?: true;
  /** A check that only runs when you ask for it. */
  optional?: { label: string };
  /** A stage you (or the brief) can switch off. */
  skippable?: { label: string; when?: SkipWhen };
  /** When one of these stages is redone in a fix round, this one is redone after it. */
  rerunAfter?: string[];
  /** Fix rounds continue this stage's own last session instead of starting fresh. */
  resumeOnFix?: true;
  gate?: GateDef;
  maxTurns?: number;
  timeoutMinutes?: number;
  model?: string;
}

export interface LineDef {
  key: string;
  team: TeamId;
  label: string;
  /** What the line makes, for headers like "5 videos in production". */
  noun: { one: string; many: string };
  defaults: LineSettings;
  stages: StageDef[];
  /** The work stage whose rounds are the versions (v1, v2...) the gates judge and the Review Booth shows. */
  versionStage: string;
  /** Where task folders go inside the work folder, e.g. ".smart-team" so a code repo stays clean. */
  folderRoot?: string;
}

/** Rubric weights (out of 100) per direction; dimension scores are 0-10. */
export type Rubric = Record<LineDirection, Record<string, number>>;

export const VIDEO_RUBRIC: Rubric = {
  match: { light: 25, type: 15, timing: 20, transitions: 10, brand: 15, safe: 10, tech: 5, idea: 0 },
  concept: { light: 15, type: 15, timing: 15, transitions: 10, brand: 20, safe: 10, tech: 5, idea: 10 },
};

/** Dimensions the style-frame check scores (stills cannot show motion). */
export const STILLS_DIMENSIONS = ['light', 'type', 'brand', 'safe'];

const VIDEO_DEFAULTS: LineSettings = { direction: 'match', trust: false, passMark: 80, maxFixes: 3, skipStages: [], extraChecks: [] };

export const LINES: LineDef[] = [
  {
    key: 'nextEditor.video',
    team: 'nextEditor',
    label: 'Make a video',
    noun: { one: 'video', many: 'videos' },
    defaults: VIDEO_DEFAULTS,
    versionStage: 'animate',
    stages: [
      { key: 'brief', label: 'New video', owner: YOU, kind: 'check', intake: true },
      {
        key: 'source',
        label: 'Read source',
        owner: 'wolverine',
        kind: 'work',
        access: 'write',
        dir: '01-source',
        requiredFiles: ['01-source/style-spec.md', '01-source/beat-map.json', '01-source/brand-facts.md'],
        deliverables: [
          { glob: '01-source/ref.mp4', label: 'Reference' },
          { glob: '01-source/reference-sheet.png', label: 'Reference contact sheet' },
          { glob: '01-source/reference-frames/*.png', label: 'Reference beat frames', maxFiles: 30 },
        ],
        timeoutMinutes: 90,
      },
      {
        key: 'plan',
        label: 'Plan',
        owner: 'cyclops',
        kind: 'work',
        access: 'write',
        dir: '02-plan',
        requiredFiles: ['02-plan/SPEC.md', '02-plan/storyboard.md', '02-plan/beat-plan.json', '02-plan/rubric.json'],
        deliverables: [{ glob: '02-plan/storyboard.md', label: 'Storyboard' }],
        resumeOnFix: true,
        timeoutMinutes: 60,
      },
      { key: 'ready', label: 'Ready check', owner: YOU, kind: 'check', trustSkips: true },
      {
        key: 'storyboard',
        label: 'Style frames',
        owner: 'jean-grey',
        kind: 'work',
        access: 'write',
        dir: '03-storyboard/v{round}',
        writes: ['build'],
        requiredFiles: ['03-storyboard/v{round}/sheet.png'],
        deliverables: [
          { glob: '03-storyboard/v{round}/sheet.png', label: 'Style frames' },
          { glob: '03-storyboard/v{round}/stills/*.png', label: 'Stills', maxFiles: 30 },
        ],
        rerunAfter: ['plan'],
        resumeOnFix: true,
        timeoutMinutes: 120,
      },
      {
        key: 'storyboard-check',
        label: 'Style check',
        owner: 'beast',
        kind: 'gate',
        access: 'review',
        dir: '03-storyboard',
        saveReply: '03-storyboard/check-v{round}.json',
        gate: { judge: 'flag', maxFixes: 2, minDimension: 7, fixTargets: ['storyboard'], defaultFix: 'storyboard', loopLabel: 'redo a scene' },
        timeoutMinutes: 60,
      },
      { key: 'storyboard-you', label: 'Your style check', owner: YOU, kind: 'check', optional: { label: 'Check the style frames myself' } },
      {
        key: 'animate',
        label: 'Animate & render',
        owner: 'storm',
        kind: 'work',
        access: 'write',
        dir: '04-renders/v{round}',
        writes: ['build'],
        requiredFiles: ['04-renders/v{round}/film.mp4'],
        deliverables: [
          { glob: '04-renders/v{round}/film.mp4', label: 'Render' },
          { glob: '04-renders/v{round}/poster.jpg', label: 'Poster' },
        ],
        rerunAfter: ['storyboard'],
        resumeOnFix: true,
        timeoutMinutes: 180,
      },
      {
        key: 'sound',
        label: 'Sound',
        owner: 'jean-grey',
        kind: 'work',
        access: 'write',
        dir: '05-sound/v{v}',
        writes: ['build', '04-renders/v{v}'],
        requiredFiles: ['04-renders/v{v}/film.mp4'],
        deliverables: [{ glob: '04-renders/v{v}/film.mp4', label: 'Render with sound' }],
        skippable: { label: 'skip Sound', when: 'no-sound' },
        rerunAfter: ['animate'],
        resumeOnFix: true,
        timeoutMinutes: 90,
      },
      {
        key: 'critique',
        label: 'Critique',
        owner: 'beast',
        kind: 'gate',
        access: 'review',
        dir: 'critique/v{v}',
        saveReply: 'critique/v{v}.json',
        deliverables: [
          { glob: 'critique/v{v}/sheet.png', label: 'Side-by-side sheet' },
          { glob: 'critique/v{v}/pairs/*.png', label: 'Pairs', maxFiles: 30 },
        ],
        gate: {
          judge: 'score',
          rubric: VIDEO_RUBRIC,
          main: true,
          minDimension: 6,
          fixTargets: ['plan', 'storyboard', 'animate', 'sound'],
          defaultFix: 'animate',
          loopLabel: 'fix',
        },
        timeoutMinutes: 90,
      },
      {
        key: 'screening',
        label: 'Screening',
        owner: 'cyclops',
        kind: 'gate',
        access: 'review',
        dir: 'screening',
        saveReply: 'screening/round-{round}.json',
        gate: { judge: 'flag', maxFixes: 1, fixTargets: ['storyboard', 'animate', 'sound'], defaultFix: 'animate', loopLabel: 'return' },
        timeoutMinutes: 45,
      },
      {
        key: 'variants',
        label: 'Variants',
        owner: 'storm',
        kind: 'work',
        access: 'write',
        dir: '04-renders/v{v}',
        writes: ['build'],
        deliverables: [{ glob: '04-renders/v{v}/*.mp4', label: 'Formats', maxFiles: 8 }],
        skippable: { label: 'one format only', when: 'single-format' },
        rerunAfter: ['animate', 'sound'],
        timeoutMinutes: 180,
      },
      {
        key: 'final-qa',
        label: 'Final QA',
        owner: 'captain-marvel',
        kind: 'gate',
        access: 'review',
        dir: 'final-qa',
        saveReply: 'final-qa/round-{round}.json',
        gate: { judge: 'flag', maxFixes: 1, fixTargets: ['animate', 'sound', 'variants'], defaultFix: 'animate', loopLabel: 'fix' },
        timeoutMinutes: 45,
      },
      { key: 'review', label: 'Review round', owner: YOU, kind: 'check', final: true },
    ],
  },
  DEV_LINE,
  DESIGN_LINE,
  MARKETING_LINE,
];

export function lineByKey(key: string | null | undefined): LineDef | undefined {
  return key ? LINES.find((l) => l.key === key) : undefined;
}

/** The line a new task of this team goes on, or null when the team has none yet. */
export function defaultLineKey(team: TeamId): string | null {
  return LINES.find((l) => l.team === team)?.key ?? null;
}

export function stageOf(line: LineDef, key: string): StageDef | undefined {
  return line.stages.find((s) => s.key === key);
}

/** The main gate's key: its pass mark and fix budget are yours to set. */
export function mainGate(line: LineDef): StageDef | undefined {
  return line.stages.find((s) => s.gate?.main);
}

export interface MemberInfo extends TeamMember {
  /** Null for leadership, who work for every team. */
  teamId: TeamId | null;
}

export function memberById(id: string): MemberInfo | undefined {
  const lead = LEADERSHIP.find((m) => m.id === id);
  if (lead) return { ...lead, teamId: null };
  for (const team of TEAMS) {
    const member = team.members.find((m) => m.id === id);
    if (member) return { ...member, teamId: team.id };
  }
  return undefined;
}

/** Skill manifest keys of a member: their role's and their own ("nextEditor.qa", "nextEditor.beast"; "final-qa", "captain-marvel"). */
export function memberSkillKeys(memberId: string): string[] {
  const member = memberById(memberId);
  if (!member) return [];
  const roleKey = (role: MemberRole) => (member.teamId ? `${member.teamId}.${role}` : role);
  return [roleKey(member.role), member.teamId ? `${member.teamId}.${member.id}` : member.id];
}

/** Problems with a line definition; empty when it is fine. Checked by tests for every line. */
export function validateLine(line: LineDef): string[] {
  const problems: string[] = [];
  const keys = line.stages.map((s) => s.key);
  const index = (key: string) => keys.indexOf(key);
  if (new Set(keys).size !== keys.length) problems.push('stage keys repeat');
  if (!line.stages[0]?.intake) problems.push('the first stage must be the brief');
  const finals = line.stages.filter((s) => s.final);
  if (finals.length !== 1 || line.stages.at(-1)?.final !== true) problems.push('exactly one final check, and it comes last');
  if (line.stages.filter((s) => s.gate?.main).length > 1) problems.push('more than one main gate');
  for (const stage of line.stages) {
    if (stage.owner !== YOU && !memberById(stage.owner)) problems.push(`${stage.key}: unknown owner ${stage.owner}`);
    if (stage.owner === YOU && stage.kind !== 'check') problems.push(`${stage.key}: only checks belong to you`);
    if (stage.kind === 'check' && stage.owner !== YOU) problems.push(`${stage.key}: checks belong to you`);
    if (stage.kind === 'gate' && !stage.gate) problems.push(`${stage.key}: a gate needs gate settings`);
    if (stage.gate) {
      if (!stage.gate.fixTargets.includes(stage.gate.defaultFix)) problems.push(`${stage.key}: defaultFix is not a fix target`);
      for (const target of stage.gate.fixTargets) {
        const t = line.stages[index(target)];
        if (!t || t.kind !== 'work' || index(target) >= index(stage.key)) problems.push(`${stage.key}: fix target ${target} must be an earlier work stage`);
      }
    }
    for (const after of stage.rerunAfter ?? []) {
      if (index(after) < 0 || index(after) >= index(stage.key)) problems.push(`${stage.key}: rerunAfter ${after} must be an earlier stage`);
    }
  }
  return problems;
}

/** Clean relative path inside a task folder: forward slashes, no "..", no drive or root. Null when unsafe. */
export function normalizeTaskPath(path: string): string | null {
  if (!path || path.includes('\0')) return null;
  const parts = path.replace(/\\/g, '/').split('/').filter((p) => p !== '' && p !== '.');
  if (parts.length === 0 || /^[a-zA-Z]:/.test(path) || path.startsWith('/') || path.startsWith('\\')) return null;
  if (parts.some((p) => p === '..' || p.includes(':'))) return null;
  return parts.join('/');
}

/** Glob match on forward-slash relative paths: *, ** (any folders), ?, {a,b}. Case-insensitive when asked (Windows). */
export function matchGlob(pattern: string, path: string, caseless = false): boolean {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        const slash = pattern[i + 2] === '/';
        source += slash ? '(?:.*/)?' : '.*';
        i += slash ? 2 : 1;
      } else source += '[^/]*';
    } else if (c === '?') source += '[^/]';
    else if (c === '{') {
      const end = pattern.indexOf('}', i);
      if (end < 0) source += '\\{';
      else {
        source += `(?:${pattern.slice(i + 1, end).split(',').map(escapeRegex).join('|')})`;
        i = end;
      }
    } else source += escapeRegex(c);
  }
  return new RegExp(`^${source}$`, caseless ? 'i' : '').test(path);
}

function escapeRegex(text: string): string {
  return text.replace(/[.+^$()|[\]\\]/g, '\\$&');
}

/** Fills {round} and {v} in a stage path template. */
export function fillStagePath(template: string, vars: { round: number; v: number }): string {
  return template.replace(/\{round\}/g, String(vars.round)).replace(/\{v\}/g, String(vars.v));
}
