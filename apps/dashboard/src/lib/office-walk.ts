import { HALLS, ROOMS, SPINE_X, type HallId, type Point, type RoomId } from './office';

/**
 * Walking routes through the office, so people leave by a door, follow the corridors and enter the
 * other room by its door instead of gliding through walls.
 */

/** The hallway each room's door opens onto. */
const HALL_OF: Record<RoomId, HallId> = {
  briefing: 'top',
  meeting: 'top',
  approval: 'top',
  rest: 'top',
  workspace: 'west',
  lounge: 'west',
  pantry: 'west',
  command: 'east',
  lab: 'east',
  server: 'east',
};

/** Walking speed in map units per second. */
export const WALK_SPEED = 150;

/** The corners of the walk from `from` to `to`, ending at `to` (without `from` itself). */
export function walkPath(from: Point, to: Point): Point[] {
  const start = roomAt(from);
  const end = roomAt(to);
  if (start && start === end) return [to];

  const leave = start ? { points: [doorway(start)], hall: HALL_OF[start] } : joinHall(from);
  const enter = end ? { points: [doorway(end)], hall: HALL_OF[end] } : joinHall(to);
  // Different hallways meet only at the central corridor.
  const across = leave.hall === enter.hall ? [] : [{ x: SPINE_X, y: HALLS[leave.hall] }, { x: SPINE_X, y: HALLS[enter.hall] }];

  return dedupe([...leave.points, ...across, ...enter.points, to]);
}

function roomAt(p: Point): RoomId | null {
  return ROOMS.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)?.id ?? null;
}

/** Just outside the room's door, in the middle of its hallway. */
function doorway(id: RoomId): Point {
  return { x: ROOMS.find((r) => r.id === id)!.door.x, y: HALLS[HALL_OF[id]] };
}

/** Someone already in a corridor (stopped mid-walk) steps onto the nearest hallway first. */
function joinHall(p: Point): { points: Point[]; hall: HallId } {
  const hall = (Object.keys(HALLS) as HallId[]).reduce((best, h) => (Math.abs(HALLS[h] - p.y) < Math.abs(HALLS[best] - p.y) ? h : best));
  const onSpine = Math.abs(p.x - SPINE_X) < 30;
  return { points: [{ x: onSpine ? SPINE_X : p.x, y: HALLS[hall] }], hall };
}

function dedupe(points: Point[]): Point[] {
  return points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
