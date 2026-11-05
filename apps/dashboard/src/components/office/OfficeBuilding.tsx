import { BED_W, BEDS, CONSOLE_SEATS, CONSOLE_W, CONSOLES, DESK_SEATS, DESK_W, DESKS, MAP_H, MAP_W, ROOMS, type Room, type RoomId } from '@/lib/office';

/**
 * The office floor plan, drawn as top-down pixel art: a night-time office with charcoal tile floors, thick
 * grey walls, teal glass fronts with double doors, dark wood desks with black drawers and twin monitors,
 * black office chairs and warm wall lamps. Pure drawing, no state.
 */

const C = {
  outside: '#0c0d10',
  // Walls: the top edge you see from above, its highlight, and the face of the back wall inside a room.
  wallTop: '#474b54',
  wallLight: '#5c616b',
  wallDark: '#1b1d21',
  wallFace: '#2f3238',
  wallPanel: '#2a2c32',
  baseboard: '#18191d',
  glass: '#88b4c2',
  glassLight: '#b9dbe4',
  glassFrame: '#55606b',
  chipBg: '#16171d',
  chipBorder: '#3a3d47',
  chipText: '#c3c6d6',
  occupied: '#8b7cf6',
  woodTop: '#4e3526',
  woodLight: '#6b4a34',
  woodGrain: '#563b2a',
  woodFront: '#33241a',
  drawer: '#17181c',
  drawerLine: '#26282d',
  chairBack: '#16171b',
  chairSeat: '#26272d',
  chairLight: '#383a42',
  metalTop: '#3b3f47',
  metalLight: '#555a64',
  metalFront: '#25282e',
  bezel: '#0a0b0e',
  screen: '#0e1a2b',
  glow: '#5ba3ff',
  glowGreen: '#6fd59a',
  glowPurple: '#b49cff',
  plantDark: '#24502f',
  plant: '#2f6b3f',
  plantLight: '#43905a',
  pot: '#2c2f36',
  paper: '#dfe3ea',
  lamp: '#f2c46b',
  fabric: '#23242a',
  fabricLight: '#30323a',
};

const FLOOR: Record<RoomId, string> = {
  briefing: 'tile',
  meeting: 'tile',
  approval: 'tile',
  workspace: 'tile',
  command: 'tile-dark',
  lounge: 'tile-warm',
  pantry: 'tile',
  lab: 'tile',
  server: 'tile-dark',
  rest: 'tile-warm',
};

export function OfficeBuilding({ counts }: { counts: Map<RoomId, number> }) {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 size-full" shapeRendering="crispEdges" role="img" aria-label="Office map">
      <Patterns />
      <rect width={MAP_W} height={MAP_H} fill={C.outside} />
      {/* Building shell and the corridor floor. */}
      <rect x="4" y="4" width={MAP_W - 8} height={MAP_H - 8} fill="url(#corridor)" />
      <rect x="2" y="2" width={MAP_W - 4} height={MAP_H - 4} fill="none" stroke={C.wallTop} strokeWidth="6" />
      <rect x="0" y="0" width={MAP_W} height="2" fill={C.wallLight} />
      {ROOMS.map((room) => (
        <RoomShape key={room.id} room={room} count={counts.get(room.id) ?? 0} />
      ))}
      <Hallways />
    </svg>
  );
}

function Patterns() {
  return (
    <defs>
      <pattern id="corridor" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#26282d" />
        <rect width="31" height="31" fill="#2d2f35" />
        <rect x="1" y="1" width="30" height="1" fill="#33353b" />
        <rect x="6" y="14" width="3" height="1" fill="#292b30" />
        <rect x="20" y="24" width="4" height="1" fill="#292b30" />
      </pattern>
      <pattern id="tile" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#202226" />
        <rect width="23" height="23" fill="#26282d" />
        <rect x="1" y="1" width="22" height="1" fill="#2b2d33" />
        <rect x="14" y="9" width="3" height="1" fill="#232529" />
      </pattern>
      <pattern id="tile-dark" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#1b1c20" />
        <rect width="23" height="23" fill="#212328" />
        <rect x="1" y="1" width="22" height="1" fill="#26282e" />
      </pattern>
      <pattern id="tile-warm" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#221f22" />
        <rect width="23" height="23" fill="#2a2629" />
        <rect x="1" y="1" width="22" height="1" fill="#302b2e" />
      </pattern>
      <pattern id="rug-teal" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#1b3236" />
        <rect width="1" height="1" fill="#223d42" />
        <rect x="3" y="3" width="1" height="1" fill="#223d42" />
      </pattern>
      <pattern id="rug-dark" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#2a2730" />
        <rect width="1" height="1" fill="#332f3a" />
        <rect x="3" y="3" width="1" height="1" fill="#332f3a" />
      </pattern>
      <radialGradient id="glow-warm" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={C.lamp} stopOpacity="0.32" />
        <stop offset="100%" stopColor={C.lamp} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow-blue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
      </radialGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

// ---- Rooms ----

/** Wall thickness seen from above. */
const WALL = 8;
/** Height of the back wall's face inside a room. */
const BACK = 26;
/** Depth of the glass front walls. */
const GLASS = 14;

/** Width of a doorway. */
const DOOR_W = 40;

function RoomShape({ room, count }: { room: Room; count: number }) {
  const { x, y, w, h, door } = room;
  const occupied = count > 0;
  const label = `${room.label.toUpperCase()}${occupied ? ` · ${count}` : ''}`;
  const chipW = label.length * 6.4 + 12;
  // The name chip sits on the top wall; it moves past a top doorway instead of covering it.
  const chipX = door.side === 'top' && door.x - DOOR_W / 2 < x + 6 + chipW ? door.x + DOOR_W / 2 + 4 : x + 6;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${FLOOR[room.id]})`} />

      {/* Back wall: panelled face, baseboard and the shadow it throws on the floor. */}
      <rect x={x} y={y} width={w} height={BACK} fill={C.wallFace} />
      {Array.from({ length: Math.floor(w / 40) }, (_, i) => (
        <rect key={i} x={x + 20 + i * 40} y={y + 2} width="1" height={BACK - 6} fill={C.wallPanel} />
      ))}
      <rect x={x} y={y + BACK - 4} width={w} height="4" fill={C.baseboard} />
      <rect x={x} y={y + BACK} width={w} height="6" fill="#000" opacity="0.25" />
      {door.side === 'top' && <BackDoorway x={door.x - DOOR_W / 2} y={y} />}
      {/* Inner shadow along the side walls. */}
      <rect x={x} y={y + BACK} width="5" height={h - BACK} fill="#000" opacity="0.18" />
      <rect x={x + w - 5} y={y + BACK} width="5" height={h - BACK} fill="#000" opacity="0.18" />

      <WallLamps room={room} />
      <Furniture room={room} />

      {/* Walls on the top (with a gap for a top doorway) and sides. */}
      {door.side === 'top' ? (
        <>
          <WallBand x={x - WALL} y={y - WALL} w={door.x - DOOR_W / 2 - x + WALL} h={WALL} />
          <WallBand x={door.x + DOOR_W / 2} y={y - WALL} w={x + w + WALL - door.x - DOOR_W / 2} h={WALL} />
        </>
      ) : (
        <WallBand x={x - WALL} y={y - WALL} w={w + WALL * 2} h={WALL} />
      )}
      <WallBand x={x - WALL} y={y} w={WALL} h={h} />
      <WallBand x={x + w} y={y} w={WALL} h={h} />
      {room.open ? (
        <WallBand x={x - WALL} y={y + h} w={WALL * 3} h={WALL} />
      ) : door.side === 'top' ? (
        <WallBand x={x - WALL} y={y + h} w={w + WALL * 2} h={WALL} />
      ) : (
        <GlassFront x={x} y={y + h - GLASS} w={w} doorX={door.x} />
      )}

      {occupied && (
        <>
          <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke={C.occupied} strokeWidth="7" opacity="0.22" filter="url(#soft)" />
          <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke={C.occupied} strokeWidth="2" opacity="0.9" />
        </>
      )}

      {/* Room name chip on the top wall, drawn last so nothing covers it. */}
      <g>
        <rect x={chipX} y={y - 12} width={chipW} height="15" rx="2" fill={C.chipBg} stroke={occupied ? C.occupied : C.chipBorder} opacity="0.9" />
        <text x={chipX + 6} y={y - 1} fill={occupied ? '#e6e1ff' : C.chipText} fontSize="9.5" fontFamily="ui-monospace, monospace" letterSpacing="0.8" fontWeight="700">
          {label}
        </text>
      </g>
    </g>
  );
}

function WallBand({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.wallTop} />
      <rect x={x} y={y} width={w} height="1.5" fill={C.wallLight} />
      <rect x={x} y={y + h - 1.5} width={w} height="1.5" fill={C.wallDark} />
    </g>
  );
}

/** Doorway in a back wall, seen from above: the corridor floor shows through, between two door frames. */
function BackDoorway({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={DOOR_W} height={BACK + 6} fill="url(#corridor)" />
      <rect x={x} y={y + BACK} width={DOOR_W} height="6" fill="#000" opacity="0.12" />
      <rect x={x - 3} y={y} width="3" height={BACK} fill={C.glassFrame} />
      <rect x={x + DOOR_W} y={y} width="3" height={BACK} fill={C.glassFrame} />
      <rect x={x} y={y + BACK + 4} width={DOOR_W} height="2" fill="#3a3d45" />
    </g>
  );
}

/** Glass front wall with a framed double door. */
function GlassFront({ x, y, w, doorX: doorMid }: { x: number; y: number; w: number; doorX: number }) {
  const doorW = 46;
  const doorX = doorMid - doorW / 2;
  return (
    <g>
      <GlassPane x={x} y={y} w={doorX - x} />
      <GlassPane x={doorX + doorW} y={y} w={x + w - doorX - doorW} />
      {/* Double door: darker glass, a frame and two handles. */}
      <rect x={doorX} y={y} width={doorW} height={GLASS} fill="#3d4a52" />
      <rect x={doorX + 2} y={y + 3} width={doorW / 2 - 3} height={GLASS - 6} fill={C.glass} opacity="0.35" />
      <rect x={doorX + doorW / 2 + 1} y={y + 3} width={doorW / 2 - 3} height={GLASS - 6} fill={C.glass} opacity="0.35" />
      <rect x={doorX + doorW / 2 - 4} y={y + 5} width="2" height="4" fill="#d6dde6" />
      <rect x={doorX + doorW / 2 + 2} y={y + 5} width="2" height="4" fill="#d6dde6" />
      <rect x={doorX} y={y} width={doorW} height="2" fill={C.glassFrame} />
    </g>
  );
}

function GlassPane({ x, y, w }: { x: number; y: number; w: number }) {
  if (w <= 0) return null;
  const panes = Math.max(1, Math.round(w / 52));
  const paneW = w / panes;
  return (
    <g>
      <rect x={x} y={y} width={w} height={GLASS} fill={C.glassFrame} />
      {Array.from({ length: panes }, (_, i) => (
        <g key={i}>
          <rect x={x + i * paneW + 2} y={y + 2} width={paneW - 4} height={GLASS - 5} fill={C.glass} opacity="0.75" />
          <rect x={x + i * paneW + 2} y={y + 2} width={paneW - 4} height="3" fill={C.glassLight} opacity="0.6" />
          <rect x={x + i * paneW + 5} y={y + 6} width={Math.min(10, paneW - 10)} height="1" fill="#ffffff" opacity="0.5" />
        </g>
      ))}
      <rect x={x} y={y + GLASS - 3} width={w} height="3" fill="#3e4750" />
    </g>
  );
}

/** Warm lamps on the side walls, with a soft pool of light. */
function WallLamps({ room }: { room: Room }) {
  const { x, y, h } = room;
  const ys = h > 200 ? [y + 60, y + h - 70] : [y + h / 2];
  return (
    <g>
      {ys.map((ly) => (
        <g key={ly}>
          <circle cx={x + 6} cy={ly} r="26" fill="url(#glow-warm)" shapeRendering="auto" />
          <rect x={x} y={ly - 6} width="4" height="12" fill="#4a3f2c" />
          <rect className="lamp" x={x + 1} y={ly - 4} width="3" height="8" fill={C.lamp} />
        </g>
      ))}
    </g>
  );
}

/** Corridor dressing: lamps on the pillars, the nooks between the top rooms and the stairs. */
function Hallways() {
  return (
    <g>
      {[300, 400, 640].map((y) => (
        <g key={y}>
          <circle cx={458} cy={y} r="22" fill="url(#glow-warm)" shapeRendering="auto" />
          <rect className="lamp" x={458} y={y - 5} width="3" height="10" fill={C.lamp} />
          <circle cx={522} cy={y + 40} r="22" fill="url(#glow-warm)" shapeRendering="auto" />
          <rect className="lamp" x={519} y={y + 35} width="3" height="10" fill={C.lamp} />
        </g>
      ))}
      {/* Between the briefing and meeting rooms: a water cooler and plants. */}
      <Plant x={265} y={56} />
      <WaterCooler x={256} y={110} />
      <Plant x={265} y={188} />
      {/* Between the meeting and approval rooms: a bookcase and a cabinet. */}
      <Bookcase x={624} y={34} />
      <FilingCabinet x={627} y={118} />
      <Plant x={640} y={188} />
      <Stairs x={462} y={672} w={56} h={44} />
    </g>
  );
}

function Stairs({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      {Array.from({ length: Math.floor(h / 6) }, (_, i) => (
        <g key={i}>
          <rect x={x} y={y + i * 6} width={w} height="6" fill={i % 2 ? '#34363d' : '#3d4048'} />
          <rect x={x} y={y + i * 6} width={w} height="1" fill="#4a4d56" />
        </g>
      ))}
      <rect x={x - 4} y={y} width="4" height={h} fill={C.wallTop} />
      <rect x={x + w} y={y} width="4" height={h} fill={C.wallTop} />
      <circle cx={x - 2} cy={y + 4} r="10" fill="url(#glow-warm)" shapeRendering="auto" />
      <circle cx={x + w + 2} cy={y + 4} r="10" fill="url(#glow-warm)" shapeRendering="auto" />
    </g>
  );
}

// ---- Furniture pieces ----

/** A block seen from above and a little in front: top, front face, highlight and shadow. */
function Box({ x, y, w, d, h, top, front, light }: { x: number; y: number; w: number; d: number; h: number; top: string; front: string; light?: string }) {
  return (
    <g>
      <rect x={x + 2} y={y + d + h} width={w} height="4" fill="#000" opacity="0.35" />
      <rect x={x} y={y + d} width={w} height={h} fill={front} />
      <rect x={x} y={y} width={w} height={d} fill={top} />
      <rect x={x} y={y} width={w} height="1.5" fill={light ?? '#ffffff'} opacity={light ? 1 : 0.1} />
    </g>
  );
}

/** A black office chair facing up the map: you see the seat and its backrest. */
function Chair({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 9} y={y + 12} width="18" height="3" fill="#000" opacity="0.4" />
      <rect x={x - 1} y={y + 8} width="2" height="5" fill="#0d0e10" />
      <rect x={x - 10} y={y - 7} width="20" height="9" fill={C.chairSeat} />
      <rect x={x - 10} y={y - 7} width="20" height="1" fill={C.chairLight} />
      <rect x={x - 12} y={y - 5} width="3" height="8" fill={C.chairBack} />
      <rect x={x + 9} y={y - 5} width="3" height="8" fill={C.chairBack} />
      <rect x={x - 10} y={y + 1} width="20" height="10" fill={C.chairBack} />
      <rect x={x - 10} y={y + 1} width="20" height="1.5" fill={C.chairLight} />
      <rect x={x - 8} y={y + 4} width="16" height="1" fill="#22242a" />
    </g>
  );
}

/** A black office chair facing down the map: the backrest is behind (above) the seat. */
function ChairDown({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 9} y={y + 10} width="18" height="3" fill="#000" opacity="0.4" />
      <rect x={x - 10} y={y - 10} width="20" height="10" fill={C.chairBack} />
      <rect x={x - 10} y={y - 10} width="20" height="1.5" fill={C.chairLight} />
      <rect x={x - 12} y={y - 2} width="3" height="8" fill={C.chairBack} />
      <rect x={x + 9} y={y - 2} width="3" height="8" fill={C.chairBack} />
      <rect x={x - 10} y={y} width="20" height="9" fill={C.chairSeat} />
      <rect x={x - 10} y={y} width="20" height="1" fill={C.chairLight} />
    </g>
  );
}

/** A chair seen from the side, for the ends of tables. */
function ChairSide({ x, y, left = false }: { x: number; y: number; left?: boolean }) {
  const back = left ? x - 10 : x + 6;
  return (
    <g>
      <rect x={x - 8} y={y + 9} width="16" height="3" fill="#000" opacity="0.4" />
      <rect x={x - 8} y={y - 6} width="16" height="12" fill={C.chairSeat} />
      <rect x={back} y={y - 9} width="4" height="18" fill={C.chairBack} />
      <rect x={x - 8} y={y - 6} width="16" height="1" fill={C.chairLight} />
    </g>
  );
}

const CODE_COLORS = [C.glow, C.glowGreen, C.glowPurple, '#9aa7bb'];

/** A monitor with a few lines of code on it. `seed` varies the lines. */
function Monitor({ x, y, w = 30, h = 20, seed = 0 }: { x: number; y: number; w?: number; h?: number; seed?: number }) {
  const lines = Math.floor((h - 4) / 3);
  return (
    <g>
      <rect x={x + w / 2 - 3} y={y + h} width="6" height="3" fill="#121317" />
      <rect x={x + w / 2 - 6} y={y + h + 2} width="12" height="2" fill="#1b1c21" />
      <rect x={x} y={y} width={w} height={h} fill={C.bezel} />
      <rect className="screen" x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} fill={C.screen} />
      {Array.from({ length: lines }, (_, i) => {
        const indent = ((i + seed) % 3) * 3;
        const len = 6 + ((i * 7 + seed * 5) % (w - 12 - indent));
        return <rect key={i} className="screen" x={x + 3 + indent} y={y + 3 + i * 3} width={len} height="1.2" fill={CODE_COLORS[(i + seed) % CODE_COLORS.length]} opacity={0.85} />;
      })}
    </g>
  );
}

function Keyboard({ x, y, w = 26 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="6" fill="#1a1b1f" />
      <rect x={x + 1} y={y + 1} width={w - 2} height="1" fill="#3a3c44" />
      <rect x={x + 1} y={y + 3} width={w - 2} height="1" fill="#2e3037" />
      <rect x={x + w + 3} y={y + 1} width="4" height="5" fill="#1a1b1f" />
    </g>
  );
}

function Mug({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="5" height="6" fill="#e6e1d6" />
      <rect x={x + 5} y={y + 1} width="2" height="3" fill="#e6e1d6" />
      <rect x={x + 1} y={y} width="3" height="1" fill="#5b3a26" />
    </g>
  );
}

function Plant({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  const s = small ? 0.6 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-7" y="13" width="14" height="3" fill="#000" opacity="0.35" />
      <rect x="-6" y="3" width="12" height="11" fill={C.pot} />
      <rect x="-7" y="2" width="14" height="3" fill="#3b3f48" />
      <rect x="-9" y="-6" width="7" height="9" fill={C.plantDark} />
      <rect x="2" y="-7" width="7" height="10" fill={C.plantDark} />
      <rect x="-6" y="-11" width="6" height="11" fill={C.plant} />
      <rect x="0" y="-13" width="6" height="12" fill={C.plant} />
      <rect x="-3" y="-16" width="5" height="9" fill={C.plantLight} />
      <rect x="4" y="-9" width="3" height="4" fill={C.plantLight} />
    </g>
  );
}

function Bookcase({ x, y, w = 30, h = 54 }: { x: number; y: number; w?: number; h?: number }) {
  const books = ['#7c3b33', '#2f5a9e', '#a8823a', '#2c6b49', '#5e4296', '#8a4f2e', '#3e4656'];
  const rows = Math.floor((h - 6) / 15);
  return (
    <g>
      <Box x={x} y={y} w={w} d={5} h={h} top="#4a3424" front="#2f2118" />
      {Array.from({ length: rows }, (_, r) => (
        <g key={r}>
          {Array.from({ length: Math.floor((w - 4) / 4) }, (_, i) => (
            <rect key={i} x={x + 2 + i * 4} y={y + 9 + r * 15 + ((i + r) % 3)} width="3" height={10 - ((i + r) % 3)} fill={books[(i * 3 + r * 2) % books.length]} />
          ))}
          <rect x={x + 1} y={y + 19 + r * 15} width={w - 2} height="2" fill="#4a3424" />
        </g>
      ))}
    </g>
  );
}

function FilingCabinet({ x, y, w = 24, h = 40 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <Box x={x} y={y} w={w} d={5} h={h} top="#3d4048" front="#2a2c32" />
      {Array.from({ length: Math.floor(h / 13) }, (_, i) => (
        <g key={i}>
          <rect x={x + 2} y={y + 6 + i * 13} width={w - 4} height="11" fill="#30333a" />
          <rect x={x + w / 2 - 3} y={y + 9 + i * 13} width="6" height="2" fill="#8a909c" />
        </g>
      ))}
    </g>
  );
}

function WaterCooler({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 2} y={y + 30} width="18" height="3" fill="#000" opacity="0.35" />
      <rect x={x + 3} y={y} width="14" height="10" fill="#7fb2d6" opacity="0.85" />
      <rect x={x + 5} y={y + 1} width="3" height="8" fill="#c9e3f3" opacity="0.7" />
      <rect x={x} y={y + 10} width="20" height="20" fill="#b9bec8" />
      <rect x={x + 3} y={y + 14} width="14" height="4" fill="#5d636e" />
      <rect x={x + 6} y={y + 15} width="2" height="2" fill="#5ba3ff" />
      <rect x={x + 12} y={y + 15} width="2" height="2" fill="#ef6b6b" />
    </g>
  );
}

function Printer({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="26" height="14" fill="#3a3d45" />
      <rect x={x} y={y} width="26" height="2" fill="#555a64" />
      <rect x={x + 4} y={y - 4} width="18" height="5" fill={C.paper} />
      <rect x={x + 20} y={y + 5} width="3" height="2" fill={C.glowGreen} />
    </g>
  );
}

/** A dark wood desk with black drawer pedestals. */
function WoodDesk({ x, y, w, d = 30 }: { x: number; y: number; w: number; d?: number }) {
  return (
    <g>
      <rect x={x + 3} y={y + d + 14} width={w} height="5" fill="#000" opacity="0.35" />
      <rect x={x} y={y + d} width={w} height="14" fill={C.woodFront} />
      {/* Drawer pedestals at both ends. */}
      {[x + 2, x + w - 24].map((px) => (
        <g key={px}>
          <rect x={px} y={y + d} width="22" height="14" fill={C.drawer} />
          <rect x={px + 1} y={y + d + 6} width="20" height="1" fill={C.drawerLine} />
          <rect x={px + 9} y={y + d + 3} width="4" height="1" fill="#5d626c" />
          <rect x={px + 9} y={y + d + 9} width="4" height="1" fill="#5d626c" />
        </g>
      ))}
      <rect x={x} y={y} width={w} height={d} fill={C.woodTop} />
      <rect x={x} y={y} width={w} height="2" fill={C.woodLight} />
      {[0.3, 0.62].map((f) => (
        <rect key={f} x={x + 6} y={y + d * f} width={w - 12} height="1" fill={C.woodGrain} />
      ))}
      <rect x={x} y={y + d - 1} width={w} height="1" fill="#2a1d15" />
    </g>
  );
}

/** A double desk: two seats, each with two monitors, a keyboard and a chair in front. */
function Desk({ x, y, variant = 0 }: { x: number; y: number; variant?: number }) {
  return (
    <g>
      <WoodDesk x={x} y={y} w={DESK_W} />
      {DESK_SEATS.map((s, k) => (
        <g key={s}>
          <Monitor x={x + s - 31} y={y - 14} seed={variant * 2 + k} />
          <Monitor x={x + s + 1} y={y - 14} seed={variant * 2 + k + 3} />
          <Keyboard x={x + s - 15} y={y + 18} />
          <Chair x={x + s} y={y + 56} />
        </g>
      ))}
      <Mug x={x + DESK_W - 16} y={y + 16} />
      {variant % 2 ? <Plant x={x + 10} y={y + 10} small /> : <rect x={x + 6} y={y + 16} width="10" height="7" fill={C.paper} />}
    </g>
  );
}

/** A command console: a metal bench with a row of monitors, button panels and chairs in front. */
function Console({ x, y, seed = 0 }: { x: number; y: number; seed?: number }) {
  const screens = Math.floor((CONSOLE_W - 12) / 34);
  return (
    <g>
      <rect x={x + 3} y={y + 42} width={CONSOLE_W} height="5" fill="#000" opacity="0.4" />
      <rect x={x} y={y + 26} width={CONSOLE_W} height="16" fill={C.metalFront} />
      {Array.from({ length: 6 }, (_, k) => (
        <g key={k}>
          <rect x={x + 8 + k * 52} y={y + 29} width="40" height="10" fill="#1b1d22" />
          {[0, 1, 2, 3].map((j) => (
            <rect
              key={j}
              className="led"
              x={x + 12 + k * 52 + j * 9}
              y={y + 32}
              width="4"
              height="3"
              fill={[C.glow, C.glowGreen, '#f59e0b', C.glowPurple][(j + k) % 4]}
              style={{ animationDelay: `${((k * 4 + j) % 9) * 0.2}s` }}
            />
          ))}
        </g>
      ))}
      <rect x={x} y={y} width={CONSOLE_W} height="26" fill={C.metalTop} />
      <rect x={x} y={y} width={CONSOLE_W} height="2" fill={C.metalLight} />
      {Array.from({ length: screens }, (_, k) => (
        <Monitor key={k} x={x + 8 + k * 34} y={y - 14} w={30} h={20} seed={seed + k} />
      ))}
      {CONSOLE_SEATS.map((s) => (
        <g key={s}>
          <Keyboard x={x + s - 15} y={y + 15} />
          <Chair x={x + s} y={y + 56} />
        </g>
      ))}
    </g>
  );
}

/** A large wall display: chart panels either side of a world map with live dots. */
function DashboardWall({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const side = Math.round(w * 0.22);
  const mapX = x + side + 4;
  const mapW = w - side * 2 - 8;
  const half = (h - 6) / 2;
  return (
    <g>
      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="#07080b" />
      <rect x={x} y={y} width={w} height={h} fill="#0a1220" />
      <ChartPanel x={x + 2} y={y + 2} w={side} h={half} kind="line" seed={0} />
      <ChartPanel x={x + 2} y={y + 4 + half} w={side} h={half} kind="bars" seed={1} />
      <rect className="screen" x={mapX} y={y + 2} width={mapW} height={h - 4} fill="#0b1830" />
      <WorldMap x={mapX + 4} y={y + 6} w={mapW - 8} h={h - 12} />
      <ChartPanel x={x + w - side - 2} y={y + 2} w={side} h={half} kind="pie" seed={2} />
      <ChartPanel x={x + w - side - 2} y={y + 4 + half} w={side} h={half} kind="line" seed={3} />
    </g>
  );
}

function ChartPanel({ x, y, w, h, kind, seed }: { x: number; y: number; w: number; h: number; kind: 'line' | 'bars' | 'pie'; seed: number }) {
  const color = [C.glow, '#f87171', C.glowGreen, '#fbbf24'][seed % 4]!;
  return (
    <g>
      <rect className="screen" x={x} y={y} width={w} height={h} fill="#0f1d34" />
      <rect x={x + 3} y={y + 3} width={w * 0.4} height="1.5" fill="#6b7a93" />
      {kind === 'line' && (
        <polyline
          className="screen"
          points={Array.from({ length: 8 }, (_, k) => `${x + 4 + k * ((w - 8) / 7)},${y + h - 4 - ((k * 5 + seed * 7) % (h - 10))}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          shapeRendering="auto"
        />
      )}
      {kind === 'bars' &&
        [5, 9, 6, 11, 8, 12, 7, 10].map((v, i) => (
          <rect key={i} className="screen" x={x + 4 + i * ((w - 8) / 8)} y={y + h - 3 - Math.min(v, h - 8)} width={(w - 8) / 8 - 1.5} height={Math.min(v, h - 8)} fill={i % 2 ? C.glow : C.glowPurple} />
        ))}
      {kind === 'pie' && (
        <g shapeRendering="auto">
          <circle cx={x + w * 0.3} cy={y + h / 2 + 2} r={h / 2 - 5} fill="#3b82f6" />
          <path d={piePath(x + w * 0.3, y + h / 2 + 2, h / 2 - 5, 0.38)} fill="#f97316" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x + w * 0.58} y={y + 7 + i * 5} width={w * 0.32 - i * 3} height="1.5" fill="#6b7a93" />
          ))}
        </g>
      )}
    </g>
  );
}

/** SVG path for a pie slice from 12 o'clock covering `fraction` of the circle. */
function piePath(cx: number, cy: number, r: number, fraction: number): string {
  const a = fraction * Math.PI * 2;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)} Z`;
}

/** Land blocks in a 40 x 16 grid: [col, row, width, height]. A loose, made-up world, not a real atlas. */
const LAND = [
  [3, 2, 7, 3], [5, 5, 4, 3], [9, 8, 3, 6], [12, 1, 3, 1], [16, 2, 5, 3], [17, 5, 4, 5], [22, 2, 10, 4], [24, 6, 6, 3], [31, 5, 2, 2], [32, 10, 4, 3],
];

function WorldMap({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const cx = w / 40;
  const cy = h / 16;
  return (
    <g>
      {/* Faint grid lines like a map projection. */}
      {[0.25, 0.5, 0.75].map((f) => (
        <rect key={f} x={x} y={y + h * f} width={w} height="0.6" fill="#1d3358" />
      ))}
      {LAND.map(([c, r, cw, rh], i) =>
        // Land drawn as a dot matrix, like a data-centre map.
        Array.from({ length: cw! * rh! }, (_, k) => (
          <rect key={`${i}-${k}`} x={x + (c! + (k % cw!)) * cx} y={y + (r! + Math.floor(k / cw!)) * cy} width={cx * 0.75} height={cy * 0.7} fill="#2c5a96" opacity="0.9" />
        )),
      )}
      {[
        [7, 4],
        [19, 7],
        [27, 4],
        [34, 11],
        [10, 10],
        [23, 3],
      ].map(([c, r], i) => (
        <rect key={i} className="led" x={x + c! * cx} y={y + r! * cy} width="3" height="3" fill={i % 2 ? '#f472b6' : C.glowGreen} style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
    </g>
  );
}

function Projector({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      {/* Screen on the back wall. */}
      <rect x={x - 3} y={y} width={w + 6} height="4" fill="#1b1c21" />
      <rect x={x} y={y + 4} width={w} height="24" fill="#eef1f6" />
      <rect x={x} y={y + 4} width={w} height="2" fill="#c8ced9" />
      <rect x={x} y={y + 26} width={w} height="2" fill="#aab1bd" />
      {/* Projector on a ceiling pole in front of it. */}
      <rect x={x + w / 2 - 1} y={y + 28} width="2" height="16" fill="#1b1c21" />
      <rect x={x + w / 2 - 9} y={y + 42} width="18" height="9" fill="#2b2d33" />
      <rect x={x + w / 2 - 9} y={y + 42} width="18" height="2" fill="#44474f" />
      <rect x={x + w / 2 - 3} y={y + 44} width="6" height="5" fill="#9cc7ff" opacity="0.8" />
    </g>
  );
}

function Whiteboard({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x - 2} y={y} width={w + 4} height="22" fill="#5d636e" />
      <rect x={x} y={y + 2} width={w} height="18" fill="#eef1f6" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={x + 4} y={y + 5 + i * 4} width={[w * 0.6, w * 0.8, w * 0.4, w * 0.55][i]} height="1" fill={['#3f6fd0', '#a8473d', '#2f8a5b', '#3f6fd0'][i]} />
      ))}
      {/* Sticky notes. */}
      <rect x={x + w - 12} y={y + 4} width="5" height="5" fill="#facc15" />
      <rect x={x + w - 12} y={y + 11} width="5" height="5" fill="#f472b6" />
    </g>
  );
}

function WallTV({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="20" fill={C.bezel} />
      <rect className="screen" x={x + 2} y={y + 2} width={w - 4} height="16" fill="#12243f" />
      <rect className="screen" x={x + 6} y={y + 6} width={w * 0.5} height="2" fill={C.glow} opacity="0.8" />
      <rect className="screen" x={x + 6} y={y + 11} width={w * 0.3} height="2" fill={C.glowGreen} opacity="0.7" />
    </g>
  );
}

function Sofa({ x, y, w }: { x: number; y: number; w: number }) {
  const cushions = Math.max(1, Math.floor((w - 16) / 30));
  return (
    <g>
      <rect x={x + 3} y={y + 30} width={w} height="4" fill="#000" opacity="0.4" />
      <rect x={x} y={y} width={w} height="12" fill="#1a1b20" />
      <rect x={x} y={y} width={w} height="2" fill={C.fabricLight} />
      <rect x={x} y={y + 10} width={w} height="20" fill={C.fabric} />
      {Array.from({ length: cushions }, (_, i) => (
        <rect key={i} x={x + 8 + i * ((w - 16) / cushions) + 1} y={y + 12} width={(w - 16) / cushions - 2} height="12" fill={C.fabricLight} />
      ))}
      <rect x={x} y={y + 6} width="8" height="24" fill="#1a1b20" />
      <rect x={x + w - 8} y={y + 6} width="8" height="24" fill="#1a1b20" />
    </g>
  );
}

function Armchair({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 2} y={y + 26} width="26" height="3" fill="#000" opacity="0.4" />
      <rect x={x} y={y} width="26" height="10" fill="#1a1b20" />
      <rect x={x} y={y} width="26" height="2" fill={C.fabricLight} />
      <rect x={x} y={y + 8} width="26" height="18" fill={C.fabric} />
      <rect x={x + 6} y={y + 10} width="14" height="10" fill={C.fabricLight} />
      <rect x={x} y={y + 6} width="6" height="20" fill="#1a1b20" />
      <rect x={x + 20} y={y + 6} width="6" height="20" fill="#1a1b20" />
    </g>
  );
}

function FloorLamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 8} r="28" fill="url(#glow-warm)" shapeRendering="auto" />
      <rect x={x - 1} y={y + 8} width="2" height="22" fill="#3a3d45" />
      <rect x={x - 5} y={y + 29} width="10" height="3" fill="#1b1c21" />
      <rect x={x - 7} y={y} width="14" height="9" fill="#d9c08a" />
      <rect className="lamp" x={x - 5} y={y + 8} width="10" height="2" fill={C.lamp} />
    </g>
  );
}

function DeskLamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x + 3} cy={y + 3} r="16" fill="url(#glow-warm)" shapeRendering="auto" />
      <rect x={x + 2} y={y + 3} width="2" height="7" fill="#2b2d33" />
      <rect x={x - 1} y={y} width="8" height="5" fill="#e9c27a" />
      <rect className="lamp" x={x} y={y + 4} width="6" height="1" fill="#fff3c4" />
    </g>
  );
}

function ServerRack({ x, y, h, seed = 0 }: { x: number; y: number; h: number; seed?: number }) {
  const units = Math.floor((h - 8) / 8);
  return (
    <g>
      <Box x={x} y={y} w={30} d={5} h={h} top="#2b2e35" front="#111216" />
      {Array.from({ length: units }, (_, j) => (
        <g key={j}>
          <rect x={x + 3} y={y + 8 + j * 8} width="24" height="6" fill="#1b1d22" />
          <rect x={x + 3} y={y + 8 + j * 8} width="24" height="1" fill="#2a2d34" />
          <rect
            className="led"
            x={x + 5}
            y={y + 10 + j * 8}
            width="2"
            height="2"
            fill={(seed + j) % 5 === 0 ? '#f59e0b' : C.glowGreen}
            style={{ animationDelay: `${((seed * 7 + j) % 9) * 0.2}s` }}
          />
          <rect x={x + 9} y={y + 10 + j * 8} width="2" height="2" fill={C.glow} opacity="0.7" />
          <rect x={x + 15} y={y + 10 + j * 8} width="10" height="1" fill="#30333b" />
        </g>
      ))}
    </g>
  );
}

// ---- Room contents ----

function Furniture({ room }: { room: Room }) {
  const { x, y, w, h } = room;
  const cx = x + w / 2;
  switch (room.id) {
    case 'briefing':
      // A projector screen and rows of black chairs facing it.
      return (
        <g>
          <Projector x={cx - 52} y={y + 1} w={112} />
          {Array.from({ length: 16 }, (_, i) => (
            <Chair key={i} x={x + 58 + (i % 4) * 40} y={y + 76 + Math.floor(i / 4) * 27} />
          ))}
          <FilingCabinet x={x + w - 30} y={y + 46} w={22} />
          <Plant x={x + 18} y={y + 50} />
          <Plant x={x + 18} y={y + h - 34} />
        </g>
      );
    case 'meeting': {
      const seats = 6;
      const tableW = seats * 32 + 28;
      const tx = cx - tableW / 2;
      return (
        <g>
          <WallTV x={cx - 46} y={y + 3} w={92} />
          <Whiteboard x={x + w - 82} y={y + 2} w={56} />
          <Bookcase x={x + 12} y={y + 4} w={30} h={46} />
          {Array.from({ length: seats }, (_, i) => (
            <ChairDown key={`t${i}`} x={tx + 30 + i * 32} y={y + 76} />
          ))}
          <ChairSide x={tx - 12} y={y + 104} left />
          <ChairSide x={tx + tableW + 12} y={y + 104} />
          {/* Long dark table with a glowing strip down the middle. */}
          <Box x={tx} y={y + 80} w={tableW} d={44} h={10} top={C.woodTop} front={C.woodFront} light={C.woodLight} />
          <rect x={tx + 6} y={y + 92} width={tableW - 12} height="1" fill={C.woodGrain} />
          <rect x={cx - 34} y={y + 98} width="68" height="8" fill="#151b24" />
          <rect className="screen" x={cx - 30} y={y + 101} width="60" height="2" fill="#5eead4" opacity="0.85" />
          {Array.from({ length: seats }, (_, i) => (
            <Chair key={`b${i}`} x={tx + 30 + i * 32} y={y + 146} />
          ))}
          <Plant x={x + w - 16} y={y + 44} />
          <Plant x={x + 18} y={y + h - 34} />
          <Plant x={x + w - 16} y={y + h - 34} />
        </g>
      );
    }
    case 'approval':
      // Your desk: where finished work waits for sign-off.
      return (
        <g>
          <Bookcase x={x + 12} y={y + 2} w={30} h={46} />
          <Plant x={x + 20} y={y + 70} />
          <rect x={cx - 64} y={y + 100} width={128} height={86} fill="url(#rug-teal)" />
          <ChairDown x={cx} y={y + 62} />
          <WoodDesk x={cx - 56} y={y + 66} w={112} d={30} />
          <Monitor x={cx - 32} y={y + 54} seed={4} />
          <Monitor x={cx + 2} y={y + 54} seed={6} />
          <rect x={cx - 48} y={y + 74} width="14" height="10" fill={C.paper} />
          <rect x={cx - 46} y={y + 72} width="14" height="10" fill="#f1f3f7" />
          <DeskLamp x={cx + 40} y={y + 68} />
          <Mug x={cx + 26} y={y + 80} />
          <Chair x={cx - 22} y={y + 132} />
          <Chair x={cx + 22} y={y + 132} />
          <FilingCabinet x={x + w - 32} y={y + 30} w={22} h={34} />
          <Plant x={x + w - 18} y={y + h - 36} />
        </g>
      );
    case 'rest':
      return (
        <g>
          {BEDS.map((b, i) => (
            <g key={i}>
              <Box x={b.x} y={b.y} w={BED_W} d={48} h={6} top="#3d2b20" front="#2a1d15" />
              <rect x={b.x + 3} y={b.y + 3} width={BED_W - 6} height={42} fill="#cfd5df" />
              <rect x={b.x + 7} y={b.y + 6} width={BED_W - 14} height={9} fill="#eef1f6" />
              <rect x={b.x + 3} y={b.y + 22} width={BED_W - 6} height={23} fill={['#3d4f80', '#7a3f55', '#2f6350', '#80592e'][i]} />
              <rect x={b.x + 3} y={b.y + 22} width={BED_W - 6} height="2" fill="#ffffff" opacity="0.15" />
            </g>
          ))}
          <Plant x={cx} y={y + h - 30} small />
        </g>
      );
    case 'workspace':
      // Open plan: storage along the left wall, double desks, a low counter with a printer at the front.
      return (
        <g>
          <Bookcase x={x + 10} y={y + 30} w={30} h={54} />
          <FilingCabinet x={x + 12} y={y + 104} w={26} h={40} />
          <FilingCabinet x={x + 12} y={y + 160} w={26} h={40} />
          {DESKS.map((d, i) => (
            <Desk key={i} x={d.x} y={d.y} variant={i} />
          ))}
          <Plant x={x + w - 18} y={y + 46} />
          <Box x={x + 56} y={y + h - 30} w={w - 100} d={12} h={10} top="#3d4048" front="#25272d" light="#555a64" />
          <Printer x={x + 160} y={y + h - 36} />
          {[0.08, 0.5, 0.92].map((f) => (
            <Plant key={f} x={x + 56 + (w - 100) * f} y={y + h - 36} small />
          ))}
          <Plant x={x + 18} y={y + h - 26} />
        </g>
      );
    case 'command':
      return (
        <g>
          <circle cx={cx + 30} cy={y + 170} r="200" fill="url(#glow-blue)" shapeRendering="auto" />
          <DashboardWall x={x + 70} y={y + 4} w={w - 100} h={76} />
          <ServerRack x={x + 12} y={y + 120} h={70} seed={1} />
          <FilingCabinet x={x + 14} y={y + 210} w={24} h={40} />
          <ServerRack x={x + w - 42} y={y + 130} h={70} seed={3} />
          <Monitor x={x + w - 44} y={y + 230} seed={8} />
          {CONSOLES.map((c, i) => (
            <Console key={i} x={c.x} y={c.y} seed={i * 5} />
          ))}
          <Plant x={x + 52} y={y + h - 34} />
          <Plant x={x + w - 20} y={y + h - 34} />
        </g>
      );
    case 'lounge':
      return (
        <g>
          {/* The doorway is at the top right, so the TV hangs left of the middle. */}
          <WallTV x={cx - 50} y={y + 3} w={80} />
          <rect x={x + 22} y={y + 52} width={w - 44} height={104} fill="url(#rug-dark)" />
          <Sofa x={x + 40} y={y + 40} w={w - 84} />
          <Box x={cx - 28} y={y + 86} w={56} d={20} h={7} top={C.woodTop} front={C.woodFront} light={C.woodLight} />
          <Mug x={cx - 16} y={y + 92} />
          <Plant x={cx + 12} y={y + 96} small />
          <Armchair x={x + 10} y={y + 82} />
          <Armchair x={x + w - 36} y={y + 82} />
          <FloorLamp x={x + 22} y={y + 30} />
          <Plant x={x + 18} y={y + h - 28} />
          <Plant x={x + w - 18} y={y + h - 28} />
        </g>
      );
    case 'pantry':
      return (
        <g>
          {/* Fridge, then a counter with a coffee machine, microwave and sink; the doorway is at the top right. */}
          <Box x={x + 10} y={y + 6} w={30} d={8} h={60} top="#c3c8d1" front="#9aa1ad" />
          <rect x={x + 10} y={y + 36} width="30" height="1" fill="#6b7280" />
          <rect x={x + 34} y={y + 20} width="2" height="12" fill="#5f6775" />
          <rect x={x + 34} y={y + 42} width="2" height="16" fill="#5f6775" />
          <Box x={x + 48} y={y + 20} w={w - 110} d={20} h={22} top="#3d4048" front="#25272d" light="#555a64" />
          {Array.from({ length: Math.floor((w - 110) / 30) }, (_, i) => (
            <rect key={i} x={x + 52 + i * 30} y={y + 44} width="26" height="16" fill="#2c2f36" />
          ))}
          <rect x={x + 58} y={y + 8} width="16" height="18" fill="#1c1d22" />
          <rect x={x + 62} y={y + 12} width="8" height="4" fill="#ef4444" opacity="0.8" />
          <rect x={x + 82} y={y + 10} width="28" height="16" fill="#2f3239" />
          <rect x={x + 85} y={y + 13} width="18" height="10" fill="#111317" />
          <rect x={x + 106} y={y + 14} width="2" height="6" fill={C.glowGreen} />
          <rect x={x + 122} y={y + 24} width="26" height="12" fill="#6f7a88" />
          <rect x={x + 124} y={y + 26} width="22" height="8" fill="#4a5563" />
          <rect x={x + 133} y={y + 18} width="2" height="7" fill="#9aa1ad" />
          {/* Dining table with stools. */}
          <Box x={cx - 48} y={y + 98} w={96} d={26} h={8} top={C.woodTop} front={C.woodFront} light={C.woodLight} />
          <Plant x={cx} y={y + 104} small />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={cx - 38 + i * 32} y={y + 86} width="14" height="9" fill="#1a1b20" />
              <rect x={cx - 38 + i * 32} y={y + 140} width="14" height="9" fill="#1a1b20" />
              <rect x={cx - 38 + i * 32} y={y + 140} width="14" height="1" fill={C.chairLight} />
            </g>
          ))}
          <Plant x={x + 16} y={y + h - 30} />
        </g>
      );
    case 'lab':
      // Test bench: where builds and checks run.
      return (
        <g>
          <Box x={x + 70} y={y + 30} w={w - 84} d={20} h={10} top="#b9bfc9" front="#5d6572" light="#dfe3ea" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={x + 84 + i * 20} y={y + 20} width="3" height="10" fill="#cbd5e1" />
              <rect x={x + 80 + i * 20} y={y + 30} width="11" height="9" fill={['#34d399', '#60a5fa', '#f472b6'][i]} opacity="0.85" />
            </g>
          ))}
          <Monitor x={x + w - 52} y={y + 18} w={28} h={18} seed={2} />
          <FilingCabinet x={x + 12} y={y + 36} w={22} h={30} />
          <Plant x={x + w - 14} y={y + 76} small />
        </g>
      );
    case 'server':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <ServerRack key={i} x={x + 96 + i * 34} y={y + 6} h={50} seed={i} />
          ))}
          {/* Operator desk beside the racks. */}
          <WoodDesk x={x + 12} y={y + 58} w={68} d={18} />
          <Monitor x={x + 16} y={y + 46} w={26} h={16} seed={5} />
          <Monitor x={x + 46} y={y + 46} w={26} h={16} seed={7} />
          <DeskLamp x={x + 72} y={y + 52} />
        </g>
      );
  }
}
