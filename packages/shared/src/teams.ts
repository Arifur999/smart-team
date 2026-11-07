// Teams, their members and the leadership above them. Re-exported from index.ts.
import type { RunMode } from './index.js';

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
