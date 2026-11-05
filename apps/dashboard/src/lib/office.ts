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
  /** Where people stand (their feet), in the order they fill up. */
  slots: Point[];
}

/** Map coordinates. The office is drawn in a 1000 x 640 box. */
export const MAP_W = 1000;
export const MAP_H = 640;

const grid = (x0: number, y0: number, cols: number, rows: number, dx: number, dy: number): Point[] =>
  Array.from({ length: rows * cols }, (_, i) => ({ x: x0 + (i % cols) * dx, y: y0 + Math.floor(i / cols) * dy }));

/** Workspace desks (top-left of each desk). People sit behind them, so their slot is just above the desk. */
export const DESKS: Point[] = grid(55, 300, 3, 2, 150, 92);
export const DESK_W = 96;

/** Beds in the rest room (top-left). */
export const BEDS: Point[] = grid(842, 478, 2, 2, 66, 70);

export const ROOMS: Room[] = [
  { id: 'briefing', label: 'Briefing Room', x: 20, y: 20, w: 280, h: 190, slots: grid(75, 190, 4, 1, 55, 0) },
  { id: 'command', label: 'Command Center', x: 310, y: 20, w: 360, h: 190, slots: grid(395, 172, 4, 1, 64, 0) },
  { id: 'approval', label: 'Approval Room', x: 680, y: 20, w: 300, h: 190, slots: grid(760, 182, 3, 1, 70, 0) },
  { id: 'workspace', label: 'Workspace', x: 20, y: 220, w: 470, h: 210, slots: DESKS.map((d) => ({ x: d.x + DESK_W / 2, y: d.y + 8 })) },
  { id: 'lab', label: 'R&D Lab', x: 500, y: 220, w: 250, h: 210, slots: grid(560, 412, 3, 1, 62, 0) },
  { id: 'server', label: 'Server Room', x: 760, y: 220, w: 220, h: 210, slots: grid(815, 412, 3, 1, 55, 0) },
  { id: 'meeting', label: 'Meeting Room', x: 20, y: 440, w: 300, h: 180, slots: grid(65, 608, 5, 1, 55, 0) },
  { id: 'lounge', label: 'Lounge', x: 330, y: 440, w: 330, h: 180, slots: grid(372, 560, 4, 2, 76, 54) },
  { id: 'pantry', label: 'Pantry', x: 670, y: 440, w: 150, h: 180, slots: grid(712, 610, 2, 1, 66, 0) },
  { id: 'rest', label: 'Rest Room', x: 830, y: 440, w: 150, h: 180, slots: BEDS.map((b) => ({ x: b.x + 26, y: b.y + 44 })) },
];

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
  const active = executing ?? planning;
  const firstWorker = team.members.find((m) => m.role === 'worker')?.id;

  const activityOf = (member: TeamMember): Activity => {
    switch (member.role) {
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
        // Manager, Final QA, intake agent and command bot start working in later phases.
        return offDuty();
    }
  };

  // Leadership shows in every team's office; the plan agent plans for all of them.
  const people = [
    ...LEADERSHIP.map((m) => ({ ...m, color: LEADERSHIP_COLOR, teamLabel: 'Leadership', activity: activityOf(m) })),
    ...team.members.map((m) => ({ ...m, color: team.color, teamLabel: team.label, activity: activityOf(m) })),
  ];

  return placeInRooms(people);
}

/** When the lounge is full, idle people wander into the pantry, then the meeting room. */
const OVERFLOW: Partial<Record<RoomId, RoomId>> = { lounge: 'pantry', pantry: 'meeting' };

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
