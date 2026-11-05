import { ROOMS, type Point, type RoomId } from './office';

/**
 * Walking routes through the office, so people leave by a door, follow the corridors and enter the
 * other room by its door instead of gliding through walls.
 *
 * The corridors: a hallway along the bottom of the top rooms, the central corridor between the workspace
 * and the command center, a hallway under each of those two, and one along the bottom of the floor.
 */
type HallId = 'top' | 'west' | 'east' | 'bottom';

const HALL_Y: Record<HallId, number> = { top: 241, west: 513, east: 590, bottom: 712 };
/** The central corridor every hallway meets. */
const SPINE_X = 490;

/** Each room's doorway (on its hallway) and the hallway it opens onto. */
const DOORS: Record<RoomId, { x: number; hall: HallId }> = {
  briefing: { x: 128, hall: 'top' },
  meeting: { x: 451, hall: 'top' },
  approval: { x: 771, hall: 'top' },
  rest: { x: 939, hall: 'top' },
  workspace: { x: 231, hall: 'west' },
  command: { x: 759, hall: 'east' },
  lounge: { x: 119, hall: 'bottom' },
  pantry: { x: 344, hall: 'bottom' },
  lab: { x: 635, hall: 'bottom' },
  server: { x: 870, hall: 'bottom' },
};

/** Walking speed in map units per second. */
export const WALK_SPEED = 150;

/** The corners of the walk from `from` to `to`, ending at `to` (without `from` itself). */
export function walkPath(from: Point, to: Point): Point[] {
  const start = roomAt(from);
  const end = roomAt(to);
  if (start && start === end) return [to];

  const leave = start ? { points: [door(start)], hall: DOORS[start].hall } : joinHall(from);
  const enter = end ? { points: [door(end)], hall: DOORS[end].hall } : joinHall(to);
  // Different hallways meet only at the central corridor.
  const across = leave.hall === enter.hall ? [] : [{ x: SPINE_X, y: HALL_Y[leave.hall] }, { x: SPINE_X, y: HALL_Y[enter.hall] }];

  return dedupe([...leave.points, ...across, ...enter.points, to]);
}

function roomAt(p: Point): RoomId | null {
  return ROOMS.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)?.id ?? null;
}

function door(room: RoomId): Point {
  const { x, hall } = DOORS[room];
  return { x, y: HALL_Y[hall] };
}

/** Someone already in a corridor (stopped mid-walk) steps onto the nearest hallway first. */
function joinHall(p: Point): { points: Point[]; hall: HallId } {
  const hall = (Object.keys(HALL_Y) as HallId[]).reduce((best, h) => (Math.abs(HALL_Y[h] - p.y) < Math.abs(HALL_Y[best] - p.y) ? h : best));
  const onSpine = Math.abs(p.x - SPINE_X) < 30;
  return { points: [{ x: onSpine ? SPINE_X : p.x, y: HALL_Y[hall] }], hall };
}

function dedupe(points: Point[]): Point[] {
  return points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
