import { LEADERSHIP, TEAMS, type TaskSummary, type TeamId, type TeamMember } from '@smart-team/shared';

export type RoomId = 'briefing' | 'command' | 'approval' | 'workspace' | 'review' | 'server' | 'meeting' | 'lounge';

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
  /** Where people stand, in the order they fill up. */
  slots: Point[];
}

/** Map coordinates. The office is drawn in a 1000 x 640 box. */
export const MAP_W = 1000;
export const MAP_H = 640;

const grid = (x0: number, y0: number, cols: number, rows: number, dx: number, dy: number): Point[] =>
  Array.from({ length: rows * cols }, (_, i) => ({ x: x0 + (i % cols) * dx, y: y0 + Math.floor(i / cols) * dy }));

export const ROOMS: Room[] = [
  { id: 'briefing', label: 'Briefing Room', x: 20, y: 20, w: 300, h: 200, slots: grid(90, 175, 4, 1, 55, 0) },
  { id: 'command', label: 'Command Center', x: 340, y: 20, w: 340, h: 200, slots: grid(420, 175, 4, 1, 60, 0) },
  { id: 'approval', label: 'Approval Room', x: 700, y: 20, w: 280, h: 200, slots: grid(800, 175, 3, 1, 60, 0) },
  // Workspace slots sit at the six desks, in front of the monitors.
  { id: 'workspace', label: 'Workspace', x: 20, y: 240, w: 460, h: 220, slots: [...grid(95, 335, 3, 1, 145, 0), ...grid(95, 435, 3, 1, 145, 0)] },
  { id: 'review', label: 'Review Room', x: 500, y: 240, w: 220, h: 220, slots: grid(560, 420, 3, 1, 50, 0) },
  { id: 'server', label: 'Server Room', x: 740, y: 240, w: 240, h: 220, slots: grid(800, 420, 3, 1, 55, 0) },
  { id: 'meeting', label: 'Meeting Room', x: 20, y: 480, w: 360, h: 140, slots: grid(80, 600, 5, 1, 60, 0) },
  { id: 'lounge', label: 'Lounge', x: 400, y: 480, w: 580, h: 140, slots: grid(460, 560, 9, 2, 60, 46) },
];

export type Tone = 'busy' | 'waiting' | 'idle';

export interface Activity {
  room: RoomId;
  /** Short status, e.g. "Planning", "Working", "Idle". */
  label: string;
  /** What it is about, e.g. the task title. */
  detail?: string;
  tone: Tone;
  taskId?: string;
}

export interface OfficeMember extends TeamMember {
  color: string;
  teamLabel: string;
  activity: Activity;
  position: Point;
}

const LEADERSHIP_COLOR = '#64748b';

const idle = (label = 'Idle'): Activity => ({ room: 'lounge', label, tone: 'idle' });

/**
 * Who is where, worked out from the live task list.
 * Until the team phases land, the plan agent plans every task, the team leader supervises its team's
 * running tasks and the first worker carries out the approved one. Everyone else waits in the lounge.
 */
export function officeMembers(teamId: TeamId, tasks: TaskSummary[]): OfficeMember[] {
  const team = TEAMS.find((t) => t.id === teamId) ?? TEAMS[0]!;
  const mine = tasks.filter((t) => t.team === team.id);

  const planning = mine.find((t) => t.status === 'RUNNING' && t.mode === 'PLAN');
  const awaiting = mine.find((t) => t.status === 'AWAITING_APPROVAL');
  const executing = mine.find((t) => t.status === 'RUNNING' && t.mode === 'EXECUTE');
  const queued = mine.find((t) => t.status === 'QUEUED');
  const active = executing ?? planning;

  const activityOf = (member: TeamMember, index: number): Activity => {
    switch (member.role) {
      case 'planner':
        if (planning) return { room: 'briefing', label: 'Planning', detail: planning.title, tone: 'busy', taskId: planning.id };
        if (awaiting) return { room: 'approval', label: 'Waiting for your approval', detail: awaiting.title, tone: 'waiting', taskId: awaiting.id };
        return idle();
      case 'leader':
        if (active) return { room: 'command', label: 'Supervising', detail: active.title, tone: 'busy', taskId: active.id };
        return idle();
      case 'worker':
        // Only the team's first worker runs tasks until Team Leaders split work (phase 5).
        if (index === firstWorkerIndex(team.members)) {
          if (executing) return { room: 'workspace', label: `Working on ${executing.deviceName}`, detail: executing.title, tone: 'busy', taskId: executing.id };
          if (queued) return { room: 'briefing', label: 'Queued', detail: queued.title, tone: 'waiting', taskId: queued.id };
        }
        return idle();
      default:
        // Manager, Final QA, intake, command bot and team QA start working in later phases.
        return idle(member.role === 'qa' ? 'Idle' : 'Off duty');
    }
  };

  // Leadership shows in every team's office; the plan agent plans for all of them.
  const people = [
    ...LEADERSHIP.map((m, i) => ({ ...m, color: LEADERSHIP_COLOR, teamLabel: 'Leadership', activity: activityOf(m, i) })),
    ...team.members.map((m, i) => ({ ...m, color: team.color, teamLabel: team.label, activity: activityOf(m, i) })),
  ];

  return placeInRooms(people);
}

function firstWorkerIndex(members: TeamMember[]): number {
  return members.findIndex((m) => m.role === 'worker');
}

/** Gives everyone the next free slot of their room, in list order, so positions are stable. */
function placeInRooms<T extends { activity: Activity }>(people: T[]): (T & { position: Point })[] {
  const used = new Map<RoomId, number>();
  return people.map((person) => {
    const room = ROOMS.find((r) => r.id === person.activity.room)!;
    const n = used.get(room.id) ?? 0;
    used.set(room.id, n + 1);
    const slot = room.slots[n % room.slots.length]!;
    // If a room is over full, offset the extra people a little so they do not stack exactly.
    const lap = Math.floor(n / room.slots.length);
    return { ...person, position: { x: slot.x + lap * 14, y: slot.y - lap * 10 } };
  });
}

export function initials(name: string): string {
  const parts = name.split(' ');
  return (parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : name.slice(0, 2)).toUpperCase();
}
