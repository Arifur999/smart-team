import { BED_W, BEDS, CONSOLE_SEATS, CONSOLE_W, CONSOLES, DESK_SEATS, DESK_W, DESKS, MAP_H, MAP_W, ROOMS, type Room, type RoomId } from '@/lib/office';

/**
 * The office floor plan: one building with thick shared walls, a grey tiled corridor, rooms with glass
 * fronts and double doors, wall lamps and dense furniture. Pure drawing, no state.
 */

const C = {
  outside: '#0b0c10',
  outerWall: '#181b22',
  outerWallTop: '#3d4352',
  wall: '#1a1c22',
  wallTop: '#535b6e',
  wallFace: '#2a2e39',
  baseboard: '#15171d',
  glass: '#8fc3e6',
  glassFrame: '#3b4555',
  chipBg: '#11131a',
  chipBorder: '#4a5163',
  chipText: '#c7cede',
  occupied: '#8b7cf6',
  deskTop: '#5a4535',
  deskFront: '#3d2f25',
  chair: '#1c1f26',
  chairSeat: '#2b2f39',
  metal: '#4a505c',
  metalTop: '#5d6472',
  metalFront: '#343944',
  screen: '#0b1424',
  glow: '#5b9cff',
  glowGreen: '#34d399',
  plant: '#2f7a4b',
  plantLight: '#46a46a',
  pot: '#3a3f4a',
  paper: '#e4e8ef',
  lamp: '#ffd27a',
};

const FLOOR: Record<RoomId, string> = {
  briefing: 'carpet',
  meeting: 'carpet',
  approval: 'room-tile',
  workspace: 'room-tile',
  command: 'room-tile-dark',
  lounge: 'carpet-warm',
  pantry: 'room-tile',
  lab: 'room-tile-light',
  server: 'room-tile-dark',
  rest: 'carpet-warm',
};

export function OfficeBuilding({ counts }: { counts: Map<RoomId, number> }) {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 size-full" shapeRendering="crispEdges" role="img" aria-label="Office map">
      <Patterns />
      <rect width={MAP_W} height={MAP_H} fill={C.outside} />
      {/* Building shell and corridor floor. */}
      <rect x="4" y="4" width={MAP_W - 8} height={MAP_H - 8} fill="url(#corridor)" />
      <rect x="4" y="4" width={MAP_W - 8} height={MAP_H - 8} fill="none" stroke={C.outerWall} strokeWidth="8" />
      <rect x="0" y="0" width={MAP_W} height="3" fill={C.outerWallTop} />
      {ROOMS.map((room) => (
        <RoomShape key={room.id} room={room} count={counts.get(room.id) ?? 0} />
      ))}
      {/* Corridor dressing: lamps along the halls, the nooks between the top rooms and the stairs down. */}
      {[300, 420, 540, 640].map((y) => (
        <CorridorLamp key={y} x={490} y={y} />
      ))}
      {[130, 360, 760].map((x) => (
        <CorridorLamp key={`t${x}`} x={x} y={241} />
      ))}
      {[120, 340].map((x) => (
        <CorridorLamp key={`b${x}`} x={x} y={517} />
      ))}
      <Plant x={265} y={64} />
      <rect x={256} y={112} width="18" height="26" fill="#9aa1ad" />
      <rect x={258} y={106} width="14" height="8" fill="#7aa7d8" opacity="0.8" />
      <Plant x={265} y={204} />
      <Shelf x={624} y={40} />
      <Cabinet x={627} y={120} w={26} />
      <Plant x={640} y={204} />
      <Stairs x={462} y={672} w={56} h={42} />
    </svg>
  );
}

function Patterns() {
  return (
    <defs>
      <pattern id="corridor" width="28" height="28" patternUnits="userSpaceOnUse">
        <rect width="28" height="28" fill="#2a2d34" />
        <rect width="27" height="27" fill="#31343c" />
        <rect x="3" y="3" width="8" height="1" fill="#383b44" />
      </pattern>
      <pattern id="room-tile" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="#1d2027" />
        <rect width="21" height="21" fill="#252830" />
        <rect x="2" y="2" width="6" height="1" fill="#2c2f38" />
      </pattern>
      <pattern id="room-tile-dark" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="#171a22" />
        <rect width="21" height="21" fill="#1e222c" />
      </pattern>
      <pattern id="room-tile-light" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="#272a32" />
        <rect width="21" height="21" fill="#2f333c" />
      </pattern>
      <pattern id="rug" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#3a2f4a" />
        <rect width="4" height="4" fill="#43375a" />
        <rect x="4" y="4" width="4" height="4" fill="#43375a" />
      </pattern>
      <pattern id="carpet" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#262a33" />
        <rect width="1" height="1" fill="#2f3440" />
      </pattern>
      <pattern id="carpet-warm" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#2b2726" />
        <rect width="1" height="1" fill="#36302e" />
      </pattern>
      <radialGradient id="glow-warm" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={C.lamp} stopOpacity="0.3" />
        <stop offset="100%" stopColor={C.lamp} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow-blue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
      </radialGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

const WALL = 7;
const BACK = 22;
/** Depth of the glass front walls. */
const GLASS = 11;

function RoomShape({ room, count }: { room: Room; count: number }) {
  const { x, y, w, h } = room;
  const occupied = count > 0;
  const doorW = 44;
  const doorX = x + w / 2 - doorW / 2;
  const label = `${room.label.toUpperCase()}${occupied ? ` · ${count}` : ''}`;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${FLOOR[room.id]})`} />
      {occupied && <rect x={x} y={y} width={w} height={h} fill={C.occupied} opacity="0.05" />}

      {/* Back wall with baseboard and its shadow on the floor. */}
      <rect x={x} y={y} width={w} height={BACK} fill={C.wallFace} />
      <rect x={x} y={y + BACK - 3} width={w} height="3" fill={C.baseboard} />
      <rect x={x} y={y + BACK} width={w} height="4" fill="#000" opacity="0.3" />

      {/* Thick walls on top and sides, shared visually with the corridor. */}
      <rect x={x - 2} y={y - WALL + 2} width={w + 4} height={WALL} fill={C.wall} />
      <rect x={x - 2} y={y - WALL + 2} width={w + 4} height="2" fill={C.wallTop} />
      <rect x={x - WALL + 2} y={y} width={WALL} height={h} fill={C.wall} />
      <rect x={x + w - 2} y={y} width={WALL} height={h} fill={C.wall} />

      {/* Wall sconces with a warm pool of light. */}
      {[0.25, 0.75].map((f) => (
        <g key={f}>
          <circle cx={x + w * f} cy={y + BACK + 14} r="30" fill="url(#glow-warm)" shapeRendering="auto" />
          <rect x={x + w * f - 4} y={y + 6} width="8" height="3" fill="#5c4f36" />
          <rect className="lamp" x={x + w * f - 2} y={y + 9} width="4" height="5" fill={C.lamp} />
        </g>
      ))}

      {/* Glass front wall with a double door; open-plan areas have none. */}
      {!room.open && (
        <>
          <GlassWall x={x} y={y + h - GLASS} w={doorX - x} />
          <GlassWall x={doorX + doorW} y={y + h - GLASS} w={x + w - doorX - doorW} />
          <rect x={doorX} y={y + h - GLASS} width={doorW / 2 - 1} height={GLASS} fill={C.glass} opacity="0.18" />
          <rect x={doorX + doorW / 2 + 1} y={y + h - GLASS} width={doorW / 2 - 1} height={GLASS} fill={C.glass} opacity="0.18" />
          <rect x={doorX} y={y + h - GLASS} width={doorW} height="1.5" fill={C.glassFrame} />
          <rect x={doorX + doorW / 2 - 4} y={y + h - 7} width="2" height="4" fill="#c9d3e0" />
          <rect x={doorX + doorW / 2 + 2} y={y + h - 7} width="2" height="4" fill="#c9d3e0" />
        </>
      )}

      {occupied && (
        <>
          <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} fill="none" stroke={C.occupied} strokeWidth="6" opacity="0.25" filter="url(#soft)" />
          <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} fill="none" stroke={C.occupied} strokeWidth="2" opacity="0.9" />
        </>
      )}

      <Furniture room={room} />

      {/* Room name chip, drawn last so furniture never covers it. */}
      <g>
        <rect x={x + 8} y={y + 26} width={label.length * 6.2 + 12} height="15" rx="3" fill={C.chipBg} stroke={occupied ? C.occupied : C.chipBorder} opacity="0.92" />
        <text x={x + 14} y={y + 37} fill={occupied ? '#ffffff' : C.chipText} fontSize="9.5" fontFamily="ui-monospace, monospace" letterSpacing="0.8" fontWeight="600">
          {label}
        </text>
      </g>
    </g>
  );
}

function GlassWall({ x, y, w }: { x: number; y: number; w: number }) {
  if (w <= 0) return null;
  return (
    <g>
      <rect x={x} y={y} width={w} height={GLASS} fill="#5f8fa8" opacity="0.5" />
      <rect x={x} y={y + 2} width={w} height={GLASS - 5} fill={C.glass} opacity="0.35" />
      <rect x={x} y={y} width={w} height="2" fill={C.glassFrame} />
      <rect x={x} y={y + GLASS - 3} width={w} height="3" fill={C.glassFrame} />
      {Array.from({ length: Math.max(0, Math.floor(w / 42)) }, (_, i) => (
        <rect key={i} x={x + 40 + i * 42} y={y} width="2" height={GLASS} fill={C.glassFrame} />
      ))}
      {/* A glint on every pane. */}
      {Array.from({ length: Math.max(1, Math.floor(w / 42)) }, (_, i) => (
        <rect key={`g${i}`} x={x + 5 + i * 42} y={y + 3} width={Math.min(12, w - 8)} height="1" fill="#ffffff" opacity="0.4" />
      ))}
    </g>
  );
}

function Stairs({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      {Array.from({ length: Math.floor(h / 6) }, (_, i) => (
        <rect key={i} x={x} y={y + i * 6} width={w} height="5" fill={i % 2 ? '#3a3e47' : '#454a55'} />
      ))}
      <rect x={x - 3} y={y} width="3" height={h} fill="#22252c" />
      <rect x={x + w} y={y} width="3" height={h} fill="#22252c" />
    </g>
  );
}

function CorridorLamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="22" fill="url(#glow-warm)" shapeRendering="auto" />
      <rect className="lamp" x={x - 2} y={y - 3} width="4" height="6" fill={C.lamp} />
    </g>
  );
}

// ---- Furniture ----

function Box({ x, y, w, d, h, top, front }: { x: number; y: number; w: number; d: number; h: number; top: string; front: string }) {
  return (
    <g>
      <rect x={x + 2} y={y + d + h} width={w} height="3" fill="#000" opacity="0.35" />
      <rect x={x} y={y + d} width={w} height={h} fill={front} />
      <rect x={x} y={y} width={w} height={d} fill={top} />
      <rect x={x} y={y} width={w} height="1" fill="#fff" opacity="0.1" />
    </g>
  );
}

function OfficeChair({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 7} y={y - 10} width="14" height="6" rx="1" fill={C.chair} />
      <rect x={x - 8} y={y - 5} width="16" height="9" fill={C.chairSeat} />
      <rect x={x - 9} y={y - 4} width="2" height="6" fill={C.chair} />
      <rect x={x + 7} y={y - 4} width="2" height="6" fill={C.chair} />
      <rect x={x - 1} y={y + 4} width="2" height="3" fill="#111318" />
    </g>
  );
}

function Monitor({ x, y, w = 24, h = 15, color = C.glow }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  return (
    <g>
      <rect x={x + w / 2 - 2} y={y + h} width="4" height="3" fill="#15181e" />
      <rect x={x} y={y} width={w} height={h} fill="#0f1116" />
      <rect className="screen" x={x + 1} y={y + 1} width={w - 2} height={h - 2} fill={C.screen} />
      <rect className="screen" x={x + 3} y={y + 3} width={Math.round((w - 6) * 0.65)} height="1" fill={color} />
      <rect className="screen" x={x + 3} y={y + 6} width={Math.round((w - 6) * 0.4)} height="1" fill={color} opacity="0.7" />
      <rect className="screen" x={x + 3} y={y + 9} width={Math.round((w - 6) * 0.8)} height="1" fill={color} opacity="0.5" />
    </g>
  );
}

/** A double desk: two seats, each with a chair, two monitors and a keyboard. */
function Desk({ x, y, variant = 0 }: { x: number; y: number; variant?: number }) {
  return (
    <g>
      {DESK_SEATS.map((s) => (
        <OfficeChair key={s} x={x + s} y={y - 2} />
      ))}
      <Box x={x} y={y} w={DESK_W} d={24} h={10} top={C.deskTop} front={C.deskFront} />
      {DESK_SEATS.map((s, k) => (
        <g key={s}>
          <Monitor x={x + s - 27} y={y - 8} w={25} h={16} />
          <Monitor x={x + s + 2} y={y - 8} w={25} h={16} color={(variant + k) % 2 ? C.glowGreen : C.glow} />
          <rect x={x + s - 16} y={y + 14} width="32" height="5" fill="#2a2d34" />
          <rect x={x + s - 14} y={y + 15} width="28" height="1" fill="#565b66" />
        </g>
      ))}
      <rect x={x + DESK_W / 2 - 1} y={y + 1} width="2" height="22" fill={C.deskFront} />
      <Mug x={x + DESK_SEATS[1]! + 20} y={y + 13} />
      {variant % 2 ? <Plant x={x + 8} y={y + 6} small /> : <rect x={x + 4} y={y + 13} width="8" height="6" fill="#ece5d8" />}
    </g>
  );
}

function Plant({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  const s = small ? 0.65 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="4" width="10" height="9" fill={C.pot} />
      <rect x="-6" y="3" width="12" height="2" fill="#4a505c" />
      <rect x="-7" y="-6" width="6" height="9" fill={C.plant} />
      <rect x="1" y="-7" width="6" height="10" fill={C.plant} />
      <rect x="-3" y="-11" width="6" height="10" fill={C.plantLight} />
    </g>
  );
}

function Cabinet({ x, y, w = 26, h = 34 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <Box x={x} y={y} w={w} d={6} h={h} top={C.metalTop} front={C.metalFront} />
      {Array.from({ length: Math.floor(h / 11) }, (_, i) => (
        <g key={i}>
          <rect x={x + 2} y={y + 8 + i * 11} width={w - 4} height="1" fill="#22262e" />
          <rect x={x + w / 2 - 3} y={y + 11 + i * 11} width="6" height="1" fill="#8a919e" />
        </g>
      ))}
    </g>
  );
}

function Shelf({ x, y }: { x: number; y: number }) {
  const books = ['#a8473d', '#3f6fd0', '#d9a944', '#2f8a5b', '#7a52c4', '#c26a3a'];
  return (
    <g>
      <Box x={x} y={y} w={32} d={6} h={44} top="#4a3a2e" front="#33281f" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4].map((i) => <rect key={`${row}-${i}`} x={x + 3 + i * 5.4} y={y + 9 + row * 13} width="4.4" height="10" fill={books[(i + row * 2) % books.length]} />),
      )}
    </g>
  );
}

function WallScreen({ x, y, w, h, chart = 0 }: { x: number; y: number; w: number; h: number; chart?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#06090f" />
      <rect className="screen" x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill="#0f1d36" />
      <polyline
        className="screen"
        points={Array.from({ length: 7 }, (_, k) => `${x + 6 + k * ((w - 12) / 6)},${y + h - 6 - ((k * 7 + chart * 11) % (h - 12))}`).join(' ')}
        fill="none"
        stroke={chart % 2 ? C.glowGreen : C.glow}
        strokeWidth="1.6"
      />
    </g>
  );
}

/** Land blocks for the wall map, in a 40 x 16 grid: [col, row, width, height]. A loose world, not a real atlas. */
const LAND = [
  [3, 2, 7, 3], [5, 5, 4, 3], [8, 8, 3, 5], [16, 2, 5, 3], [17, 5, 4, 5], [22, 2, 10, 4], [25, 6, 5, 3], [32, 9, 4, 3], [12, 1, 3, 1],
];

/** A big operations dashboard on the back wall: two chart panels, a world map with live dots, a pie and bars. */
function DashboardWall({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const side = Math.round(w * 0.2);
  const mapX = x + side + 6;
  const mapW = w - side * 2 - 12;
  const cell = mapW / 40;
  const rowH = (h - 8) / 16;
  return (
    <g>
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="#05070b" />
      <rect x={x} y={y} width={w} height={h} fill="#0a1222" />
      {/* Left: line chart and bars. */}
      <WallScreen x={x + 2} y={y + 2} w={side} h={h / 2 - 3} chart={2} />
      <rect className="screen" x={x + 2} y={y + h / 2} width={side} height={h / 2 - 2} fill="#0f1d36" />
      {[5, 9, 6, 11, 8, 12, 7].map((v, i) => (
        <rect key={i} className="screen" x={x + 6 + i * ((side - 8) / 7)} y={y + h - 4 - v} width={(side - 8) / 7 - 2} height={v} fill={i % 2 ? C.glow : '#a78bfa'} />
      ))}
      {/* Centre: the map. */}
      <rect className="screen" x={mapX} y={y + 2} width={mapW} height={h - 4} fill="#0c1a33" />
      {LAND.map(([c, r, cw, rh], i) => (
        <rect key={i} x={mapX + c * cell} y={y + 4 + r * rowH} width={cw * cell} height={rh * rowH} fill="#2a4f86" opacity="0.85" />
      ))}
      {[
        [7, 4],
        [19, 7],
        [27, 4],
        [34, 10],
        [10, 10],
      ].map(([c, r], i) => (
        <rect key={i} className="led" x={mapX + c * cell} y={y + 4 + r * rowH} width="2.5" height="2.5" fill={i % 2 ? '#f472b6' : C.glowGreen} style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
      {/* Right: a pie and a second chart. */}
      <rect className="screen" x={x + w - side - 2} y={y + 2} width={side} height={h / 2 - 3} fill="#0f1d36" />
      <circle cx={x + w - side / 2 - 2} cy={y + h / 4} r={Math.min(side, h / 2) / 2 - 4} fill="#60a5fa" shapeRendering="auto" />
      <path
        d={describePie(x + w - side / 2 - 2, y + h / 4, Math.min(side, h / 2) / 2 - 4, 0.62)}
        fill="#f97316"
        shapeRendering="auto"
      />
      <WallScreen x={x + w - side - 2} y={y + h / 2} w={side} h={h / 2 - 2} chart={1} />
    </g>
  );
}

/** SVG path for a pie slice from 12 o'clock covering `fraction` of the circle. */
function describePie(cx: number, cy: number, r: number, fraction: number): string {
  const a = fraction * Math.PI * 2;
  const ex = cx + r * Math.sin(a);
  const ey = cy - r * Math.cos(a);
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${ex} ${ey} Z`;
}

function Projector({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x - 3} y={y} width={w + 6} height="3" fill="#2a2e38" />
      <rect x={x} y={y + 3} width={w} height="17" fill="#eef1f6" />
      <rect x={x} y={y + 18} width={w} height="2" fill="#c3c9d4" />
      <rect x={x + w / 2 - 1} y={y + 20} width="2" height="22" fill="#2a2e38" />
      <rect x={x + w / 2 - 7} y={y + 42} width="14" height="7" fill="#3a3f4a" />
      <rect x={x + w / 2 - 2} y={y + 44} width="4" height="3" fill="#9cc7ff" />
    </g>
  );
}

function Sofa({ x, y, w, color = '#3b3f58' }: { x: number; y: number; w: number; color?: string }) {
  return (
    <g>
      <rect x={x + 2} y={y + 26} width={w} height="3" fill="#000" opacity="0.35" />
      <rect x={x} y={y} width={w} height="10" fill="#26283a" />
      <rect x={x} y={y + 8} width={w} height="18" fill={color} />
      <rect x={x} y={y + 6} width="7" height="20" fill="#2c2e42" />
      <rect x={x + w - 7} y={y + 6} width="7" height="20" fill="#2c2e42" />
      {Array.from({ length: Math.max(1, Math.floor((w - 14) / 26)) }, (_, i) => (
        <rect key={i} x={x + 9 + i * 26} y={y + 10} width="23" height="1" fill="#fff" opacity="0.12" />
      ))}
    </g>
  );
}

function Armchair({ x, y, color = '#3b3f58' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <rect x={x + 2} y={y + 22} width="24" height="3" fill="#000" opacity="0.35" />
      <rect x={x} y={y} width="24" height="8" fill="#26283a" />
      <rect x={x} y={y + 7} width="24" height="15" fill={color} />
      <rect x={x} y={y + 5} width="5" height="17" fill="#2c2e42" />
      <rect x={x + 19} y={y + 5} width="5" height="17" fill="#2c2e42" />
    </g>
  );
}

function FloorLamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 6} r="26" fill="url(#glow-warm)" shapeRendering="auto" />
      <rect x={x - 1} y={y + 6} width="2" height="22" fill="#4a505c" />
      <rect x={x - 5} y={y + 27} width="10" height="3" fill="#2a2e38" />
      <rect x={x - 6} y={y} width="12" height="7" fill="#e8d2a0" />
      <rect className="lamp" x={x - 4} y={y + 6} width="8" height="2" fill={C.lamp} />
    </g>
  );
}

function Mug({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="5" height="5" fill="#ece5d8" />
      <rect x={x + 5} y={y + 1} width="2" height="3" fill="#ece5d8" />
      <rect x={x + 1} y={y} width="3" height="1" fill="#5b3a26" />
    </g>
  );
}

function Furniture({ room }: { room: Room }) {
  const { x, y, w, h } = room;
  const cx = x + w / 2;
  switch (room.id) {
    case 'briefing':
      // A projector screen on the back wall and rows of seats facing it.
      return (
        <g>
          <Projector x={cx - 50} y={y + 1} w={110} />
          {Array.from({ length: 15 }, (_, i) => (
            <OfficeChair key={i} x={x + 44 + (i % 5) * 36} y={y + 88 + Math.floor(i / 5) * 30} />
          ))}
          <Cabinet x={x + w - 30} y={y + 52} w={20} />
          <Plant x={x + 16} y={y + 64} />
          <Plant x={x + 16} y={y + h - 34} />
        </g>
      );
    case 'meeting': {
      const seats = 6;
      const tableW = seats * 34 + 20;
      const tx = cx - tableW / 2;
      return (
        <g>
          <WallScreen x={cx - 50} y={y + 2} w={100} h={18} chart={1} />
          {/* Whiteboard with a few lines of notes. */}
          <rect x={x + w - 82} y={y + 3} width={56} height={16} fill={C.paper} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x + w - 78} y={y + 6 + i * 4} width={[30, 40, 22][i]} height="1" fill={['#3f6fd0', '#a8473d', '#2f8a5b'][i]} />
          ))}
          {Array.from({ length: seats }, (_, i) => (
            <OfficeChair key={`t${i}`} x={tx + 27 + i * 34} y={y + 78} />
          ))}
          <Box x={tx} y={y + 80} w={tableW} d={40} h={8} top={C.deskTop} front={C.deskFront} />
          <rect className="screen" x={cx - 20} y={y + 98} width="40" height="3" fill="#5eead4" opacity="0.8" />
          {Array.from({ length: seats }, (_, i) => (
            <g key={`b${i}`} transform={`rotate(180 ${tx + 27 + i * 34} ${y + 142})`}>
              <OfficeChair x={tx + 27 + i * 34} y={y + 142} />
            </g>
          ))}
          <g transform={`rotate(-90 ${tx - 12} ${y + 102})`}>
            <OfficeChair x={tx - 12} y={y + 102} />
          </g>
          <g transform={`rotate(90 ${tx + tableW + 12} ${y + 102})`}>
            <OfficeChair x={tx + tableW + 12} y={y + 102} />
          </g>
          <Plant x={x + 16} y={y + 64} />
          <Plant x={x + w - 16} y={y + 64} />
          <Plant x={x + w - 16} y={y + h - 34} />
        </g>
      );
    }
    case 'approval':
      // Your desk: where finished work waits for your sign-off.
      return (
        <g>
          <Shelf x={x + 12} y={y + 50} />
          <rect x={cx - 60} y={y + 64} width={124} height={100} fill="url(#rug)" opacity="0.6" />
          <OfficeChair x={cx + 2} y={y + 70} />
          <Box x={cx - 50} y={y + 74} w={104} d={26} h={10} top={C.deskTop} front={C.deskFront} />
          <Monitor x={cx - 10} y={y + 62} />
          <rect x={cx - 42} y={y + 82} width="16" height="11" fill={C.paper} />
          <circle cx={cx + 40} cy={y + 80} r="12" fill="url(#glow-warm)" shapeRendering="auto" />
          <rect x={cx + 37} y={y + 79} width="6" height="8" fill="#e8c46a" />
          <Mug x={cx + 22} y={y + 86} />
          {[-18, 22].map((dx) => (
            <g key={dx} transform={`rotate(180 ${cx + dx} ${y + 128})`}>
              <OfficeChair x={cx + dx} y={y + 128} />
            </g>
          ))}
          <Cabinet x={x + w - 30} y={y + 52} w={20} h={30} />
          <Plant x={x + w - 16} y={y + h - 40} />
        </g>
      );
    case 'rest':
      return (
        <g>
          {BEDS.map((b, i) => (
            <g key={i}>
              <Box x={b.x} y={b.y} w={BED_W} d={48} h={6} top="#4a3a2e" front="#33281f" />
              <rect x={b.x + 3} y={b.y + 3} width={BED_W - 6} height={42} fill="#d9dee8" />
              <rect x={b.x + 7} y={b.y + 6} width={BED_W - 14} height={9} fill="#f4f6fa" />
              <rect x={b.x + 3} y={b.y + 23} width={BED_W - 6} height={22} fill={['#4f68b0', '#a24f6c', '#3f8268', '#a8743a'][i]} />
            </g>
          ))}
          <Plant x={cx} y={y + h - 26} small />
        </g>
      );
    case 'workspace':
      // Open plan: storage along the left wall, double desks, and a low counter at the front.
      return (
        <g>
          <Shelf x={x + 8} y={y + 48} />
          <Cabinet x={x + 10} y={y + 112} />
          <Cabinet x={x + 10} y={y + 166} />
          {DESKS.map((d, i) => (
            <Desk key={i} x={d.x} y={d.y} variant={i} />
          ))}
          <Plant x={x + w - 16} y={y + 52} />
          <rect x={x + w - 48} y={y + 30} width="22" height="16" fill="#3a3f4a" />
          <rect x={x + w - 45} y={y + 26} width="16" height="4" fill={C.paper} />
          <Box x={x + 56} y={y + h - 26} w={w - 76} d={10} h={8} top="#3d4250" front="#2a2e38" />
          {[0.15, 0.5, 0.85].map((f) => (
            <Plant key={f} x={x + 56 + (w - 76) * f} y={y + h - 34} small />
          ))}
          <Plant x={x + 16} y={y + h - 30} />
        </g>
      );
    case 'command':
      return (
        <g>
          <circle cx={cx} cy={y + 170} r="190" fill="url(#glow-blue)" shapeRendering="auto" />
          {/* Room for the name chip on the left, then the dashboard across the rest of the back wall. */}
          <DashboardWall x={x + 140} y={y + 4} w={w - 158} h={70} />
          <Cabinet x={x + 12} y={y + 54} w={22} h={110} />
          <Cabinet x={x + 12} y={y + 190} w={22} h={60} />
          <Cabinet x={x + w - 34} y={y + 90} w={22} h={110} />
          {CONSOLES.map((c, i) => (
            <g key={i}>
              {CONSOLE_SEATS.map((s) => (
                <OfficeChair key={s} x={c.x + s} y={c.y - 4} />
              ))}
              <Box x={c.x} y={c.y} w={CONSOLE_W} d={22} h={12} top={C.metalTop} front={C.metalFront} />
              {Array.from({ length: 9 }, (_, k) => (
                <Monitor key={k} x={c.x + 8 + k * 34} y={c.y - 10} w={28} h={16} color={(k + i) % 3 === 0 ? C.glowGreen : C.glow} />
              ))}
              <rect x={c.x + 20} y={c.y + 15} width={CONSOLE_W - 40} height="4" fill="#2a2d34" />
              {Array.from({ length: 12 }, (_, k) => (
                <rect key={`l${k}`} className="led" x={c.x + 26 + k * 24} y={c.y + 26} width="3" height="2" fill={k % 4 ? C.glow : C.glowGreen} style={{ animationDelay: `${k * 0.2}s` }} />
              ))}
            </g>
          ))}
          <Plant x={x + 52} y={y + h - 34} />
          <Plant x={x + w - 22} y={y + h - 34} />
        </g>
      );
    case 'lounge':
      return (
        <g>
          <WallScreen x={cx - 30} y={y + 2} w={80} h={19} chart={1} />
          <rect x={x + 24} y={y + 56} width={w - 48} height={100} fill="url(#rug)" opacity="0.7" />
          <Sofa x={x + 40} y={y + 46} w={w - 80} />
          <Box x={cx - 26} y={y + 88} w={52} d={18} h={6} top={C.deskTop} front={C.deskFront} />
          <Mug x={cx - 14} y={y + 93} />
          <Plant x={cx + 12} y={y + 92} small />
          <Armchair x={x + 12} y={y + 84} />
          <Armchair x={x + w - 36} y={y + 84} />
          <FloorLamp x={x + 22} y={y + 46} />
          <Shelf x={x + w - 40} y={y + 26} />
          <Plant x={x + 16} y={y + h - 26} />
        </g>
      );
    case 'pantry':
      return (
        <g>
          <Box x={x + 12} y={y + 26} w={30} d={8} h={58} top="#c9ced8" front="#9aa1ad" />
          <rect x={x + 36} y={y + 46} width="2" height="14" fill="#5f6775" />
          <Box x={x + 52} y={y + 30} w={w - 64} d={18} h={22} top="#a9b0bc" front="#4a515e" />
          <rect x={x + 62} y={y + 22} width="16" height="14" fill="#23262d" />
          <rect x={x + 68} y={y + 27} width="4" height="4" fill="#ef4444" />
          <rect x={x + 92} y={y + 24} width="10" height="10" fill="#1c1f26" />
          <rect x={x + 116} y={y + 26} width="22" height="10" fill="#7aa7d8" opacity="0.6" />
          <Mug x={x + 150} y={y + 32} />
          <Box x={cx - 46} y={y + 96} w={92} d={24} h={8} top={C.deskTop} front={C.deskFront} />
          <Plant x={cx} y={y + 100} small />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={cx - 36 + i * 30} y={y + 132} width="10" height="8" fill="#2b2f39" />
          ))}
          <Plant x={x + w - 16} y={y + h - 34} />
        </g>
      );
    case 'lab':
      // Test bench: where builds and checks run.
      return (
        <g>
          <Box x={x + 76} y={y + 36} w={w - 92} d={18} h={8} top="#c9cfd8" front="#6f7885" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={x + 88 + i * 22} y={y + 26} width="4" height="10" fill="#cbd5e1" />
              <rect x={x + 84 + i * 22} y={y + 36} width="12" height="8" fill={['#34d399', '#60a5fa', '#f472b6'][i]} opacity="0.85" />
            </g>
          ))}
          <Monitor x={x + w - 50} y={y + 26} w={24} h={14} />
          <Cabinet x={x + 12} y={y + 50} w={22} h={30} />
          <Plant x={x + w - 14} y={y + 72} small />
        </g>
      );
    case 'server':
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <Box x={x + 104 + i * 42} y={y + 24} w={34} d={6} h={58} top="#3a4252" front="#14171e" />
              {Array.from({ length: 5 }, (_, j) => (
                <g key={j}>
                  <rect x={x + 107 + i * 42} y={y + 34 + j * 10} width="28" height="6" fill="#20242d" />
                  <rect
                    className="led"
                    x={x + 109 + i * 42}
                    y={y + 36 + j * 10}
                    width="2"
                    height="2"
                    fill={(i + j) % 4 === 0 ? '#f59e0b' : C.glowGreen}
                    style={{ animationDelay: `${((i * 5 + j) % 7) * 0.23}s` }}
                  />
                </g>
              ))}
            </g>
          ))}
          {/* Operator desk beside the racks. */}
          <Box x={x + 14} y={y + 58} w={64} d={12} h={8} top={C.metalTop} front={C.metalFront} />
          <Monitor x={x + 18} y={y + 50} w={24} h={13} color={C.glowGreen} />
          <Monitor x={x + 48} y={y + 50} w={24} h={13} />
          <circle cx={x + 26} cy={y + 90} r="16" fill="url(#glow-warm)" shapeRendering="auto" />
        </g>
      );
  }
}
