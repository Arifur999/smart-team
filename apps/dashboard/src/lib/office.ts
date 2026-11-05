import { LEADERSHIP, TEAMS, type TaskSummary, type TeamId, type TeamMember } from '@smart-team/shared';

export type RoomId = 'briefing' | 'command' | 'approval' | 'workspace' | 'lab' | 'server' | 'meeting' | 'lounge' | 'pantry' | 'rest';

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  id: RoomId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Open plan: no glass front wall. */
  open?: boolean;
  /** The doorway: its middle, and the wall it is in. Top-row and middle rooms open at the bottom (the glass front), bottom-row rooms at the top. */
  door: { x: number; side: 'top' | 'bottom' };
  /** Where people stand (their feet), in the order they fill up. */
  slots: Point[];
}

/** Map coordinates. The office is drawn in a 1000 x 720 box. */
export const MAP_W = 1000;
export const MAP_H = 720;

const grid = (x0: number, y0: number, cols: number, rows: number, dx: number, dy: number): Point[] =>
  Array.from({ length: rows * cols }, (_, i) => ({ x: x0 + (i % cols) * dx, y: y0 + Math.floor(i / cols) * dy }));

/** Workspace double desks (top-left of each). Two people work at each one, standing at their chair in front of it. */
export const DESKS: Point[] = grid(70, 296, 2, 2, 200, 98);
export const DESK_W = 150;
/** Where the two seats of a desk are, from its left edge. */
export const DESK_SEATS = [38, 112];
/** How far below a desk or console's top edge its chairs are, which is where people stand. */
export const SEAT_Y = 64;

/** Command Center consoles (top-left): two long rows. Leaders stand at the chairs in front of them. */
export const CONSOLES: Point[] = grid(600, 360, 1, 2, 0, 110);
export const CONSOLE_W = 320;
export const CONSOLE_SEATS = [80, 240];

/** Beds in the rest room (top-left). */
export const BEDS: Point[] = grid(897, 60, 2, 2, 46, 80);
export const BED_W = 40;

/**
 * One building, laid out like a real office floor: meeting rooms along the top, an open-plan workspace and
 * the command center either side of a central corridor, and the lounge, pantry, lab and server room at
 * the bottom. Real corridors run between the rows (see HALLS), so people walk from door to door.
 */
export const ROOMS: Room[] = [
  { id: 'briefing', label: 'Briefing Room', x: 12, y: 12, w: 232, h: 200, door: { x: 128, side: 'bottom' }, slots: grid(56, 194, 4, 1, 50, 0) },
  { id: 'meeting', label: 'Meeting Room', x: 286, y: 12, w: 330, h: 200, door: { x: 451, side: 'bottom' }, slots: grid(336, 194, 5, 1, 58, 0) },
  { id: 'approval', label: 'Approval Room', x: 664, y: 12, w: 214, h: 200, door: { x: 771, side: 'bottom' }, slots: grid(712, 194, 3, 1, 58, 0) },
  { id: 'rest', label: 'Rest Room', x: 890, y: 12, w: 98, h: 200, door: { x: 939, side: 'bottom' }, slots: BEDS.map((b) => ({ x: b.x + BED_W / 2, y: b.y + 46 })) },
  {
    id: 'workspace',
    label: 'Workspace',
    x: 12,
    y: 252,
    w: 438,
    h: 250,
    open: true,
    door: { x: 231, side: 'bottom' },
    slots: DESKS.flatMap((d) => DESK_SEATS.map((s) => ({ x: d.x + s, y: d.y + SEAT_Y }))),
  },
  {
    id: 'command',
    label: 'Command Center',
    x: 530,
    y: 252,
    w: 458,
    h: 316,
    door: { x: 759, side: 'bottom' },
    slots: CONSOLES.flatMap((c) => CONSOLE_SEATS.map((s) => ({ x: c.x + s, y: c.y + SEAT_Y }))),
  },
  { id: 'lounge', label: 'Lounge', x: 12, y: 538, w: 214, h: 170, door: { x: 186, side: 'top' }, slots: grid(70, 638, 2, 2, 110, 50) },
  { id: 'pantry', label: 'Pantry', x: 238, y: 538, w: 212, h: 170, door: { x: 414, side: 'top' }, slots: grid(282, 690, 3, 1, 62, 0) },
  { id: 'lab', label: 'R&D Lab', x: 530, y: 604, w: 210, h: 104, door: { x: 570, side: 'top' }, slots: grid(600, 690, 3, 1, 50, 0) },
  { id: 'server', label: 'Server Room', x: 752, y: 604, w: 236, h: 104, door: { x: 802, side: 'top' }, slots: grid(830, 690, 2, 1, 64, 0) },
];

/**
 * The corridors people walk along: the hallway under the top rooms, the one under the workspace, the one
 * under the command center, and the central corridor (SPINE_X) that joins them.
 */
export const HALLS = { top: 228, west: 516, east: 582 } as const;
export type HallId = keyof typeof HALLS;
export const SPINE_X = 490;
export type Tone = 'busy' | 'waiting' | 'idle' | 'off';
export type Pose = 'stand' | 'type' | 'sleep';

export interface Activity {
  room: RoomId;
  /** Short status, e.g. "Planning", "Working", "Idle". */
  label: string;
  /** What it is about, e.g. the task title. */
  detail?: string;
  tone: Tone;
  pose: Pose;
  taskId?: string;
}

export interface OfficeMember extends TeamMember {
  color: string;
  /** Null for leadership, who work for every team. */
  teamId: TeamId | null;
  teamLabel: string;
  activity: Activity;
  position: Point;
}

const LEADERSHIP_COLOR = '#64748b';

const idle = (): Activity => ({ room: 'lounge', label: 'Idle', tone: 'idle', pose: 'stand' });
/** Agents whose phase is not built yet rest until they get work. */
const offDuty = (): Activity => ({ room: 'rest', label: 'Off duty', tone: 'off', pose: 'sleep' });

/**
 * Who is where, worked out from the live task list.
 * Until the team phases land, the plan agent plans every task, the team leader supervises its team's
 * running tasks and the first worker carries out the approved one. Others idle in the lounge, and
 * agents that start in later phases sleep in the rest room.
 */
export function officeMembers(teamId: TeamId, tasks: TaskSummary[]): OfficeMember[] {
  const team = TEAMS.find((t) => t.id === teamId) ?? TEAMS[0]!;
  const mine = tasks.filter((t) => t.team === team.id);

  const planning = mine.find((t) => t.status === 'RUNNING' && t.mode === 'PLAN');
  const awaiting = mine.find((t) => t.status === 'AWAITING_APPROVAL');
  const executing = mine.find((t) => t.status === 'RUNNING' && t.mode === 'EXECUTE');
  const queued = mine.find((t) => t.status === 'QUEUED');
  const checkingBrief = mine.find((t) => t.status === 'INTAKE' && t.intakePhase === 'REVIEWING');
  const briefWaiting = mine.find((t) => t.status === 'INTAKE' && t.intakePhase !== 'REVIEWING');
  const active = executing ?? planning;
  const firstWorker = team.members.find((m) => m.role === 'worker')?.id;

  const activityOf = (member: TeamMember): Activity => {
    switch (member.role) {
      case 'intake':
        if (checkingBrief) return { room: 'briefing', label: 'Checking the brief', detail: checkingBrief.title, tone: 'busy', pose: 'type', taskId: checkingBrief.id };
        if (briefWaiting) return { room: 'briefing', label: 'Waiting for your answers', detail: briefWaiting.title, tone: 'waiting', pose: 'stand', taskId: briefWaiting.id };
        return idle();
      case 'planner':
        if (planning) return { room: 'briefing', label: 'Planning', detail: planning.title, tone: 'busy', pose: 'type', taskId: planning.id };
        if (awaiting) return { room: 'approval', label: 'Waiting for your approval', detail: awaiting.title, tone: 'waiting', pose: 'stand', taskId: awaiting.id };
        return idle();
      case 'leader':
        if (active) return { room: 'command', label: 'Supervising', detail: active.title, tone: 'busy', pose: 'type', taskId: active.id };
        return idle();
      case 'worker':
        // Only the team's first worker runs tasks until Team Leaders split work (phase 5).
        if (member.id === firstWorker) {
          if (executing) return { room: 'workspace', label: `Working on ${executing.deviceName}`, detail: executing.title, tone: 'busy', pose: 'type', taskId: executing.id };
          if (queued) return { room: 'briefing', label: 'Queued', detail: queued.title, tone: 'waiting', pose: 'stand', taskId: queued.id };
        }
        return idle();
      case 'qa':
      case 'reference':
        return idle();
      default:
        // Manager, Final QA and the command bot start working in later phases.
        return offDuty();
    }
  };

  // Leadership shows in every team's office; the plan agent plans for all of them.
  const people = [
    ...LEADERSHIP.map((m) => ({ ...m, color: LEADERSHIP_COLOR, teamId: null, teamLabel: 'Leadership', activity: activityOf(m) })),
    ...team.members.map((m) => ({ ...m, color: team.color, teamId: team.id, teamLabel: team.label, activity: activityOf(m) })),
  ];

  return placeInRooms(people);
}

/** When the lounge is full, idle people wander into the pantry, then the meeting room. */
const OVERFLOW: Partial<Record<RoomId, RoomId>> = { lounge: 'pantry', pantry: 'meeting', command: 'meeting' };

/** Gives everyone the next free slot of their room, in list order, so positions are stable. */
function placeInRooms<T extends { activity: Activity }>(people: T[]): (T & { position: Point })[] {
  const used = new Map<RoomId, number>();
  return people.map((person) => {
    let room = ROOMS.find((r) => r.id === person.activity.room)!;
    while ((used.get(room.id) ?? 0) >= room.slots.length && OVERFLOW[room.id]) {
      room = ROOMS.find((r) => r.id === OVERFLOW[room.id])!;
    }
    const n = used.get(room.id) ?? 0;
    used.set(room.id, n + 1);
    const slot = room.slots[n % room.slots.length]!;
    // If a room is still over full, offset the extra people a little so they do not stack exactly.
    const lap = Math.floor(n / room.slots.length);
    return { ...person, position: { x: slot.x + lap * 14, y: slot.y - lap * 10 } };
  });
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
