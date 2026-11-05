import { BEDS, CONSOLE_W, CONSOLES, DESK_W, DESKS, MAP_H, MAP_W, ROOMS, type Room, type RoomId } from '@/lib/office';

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
      {/* Corridor dressing: lamps and plants between rooms. */}
      {[200, 492, 800].map((x) => (
        <CorridorLamp key={x} x={x} y={200} />
      ))}
      {[150, 600, 900].map((x) => (
        <CorridorLamp key={`b${x}`} x={x} y={436} />
      ))}
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

      {/* Glass front wall with a double door. */}
      <GlassWall x={x} y={y + h - GLASS} w={doorX - x} />
      <GlassWall x={doorX + doorW} y={y + h - GLASS} w={x + w - doorX - doorW} />
      <rect x={doorX} y={y + h - GLASS} width={doorW / 2 - 1} height={GLASS} fill={C.glass} opacity="0.18" />
      <rect x={doorX + doorW / 2 + 1} y={y + h - GLASS} width={doorW / 2 - 1} height={GLASS} fill={C.glass} opacity="0.18" />
      <rect x={doorX} y={y + h - GLASS} width={doorW} height="1.5" fill={C.glassFrame} />
      <rect x={doorX + doorW / 2 - 4} y={y + h - 7} width="2" height="4" fill="#c9d3e0" />
      <rect x={doorX + doorW / 2 + 2} y={y + h - 7} width="2" height="4" fill="#c9d3e0" />

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

function Desk({ x, y, w = DESK_W, variant = 0 }: { x: number; y: number; w?: number; variant?: number }) {
  return (
    <g>
      <OfficeChair x={x + w / 2} y={y - 2} />
      <Box x={x} y={y} w={w} d={24} h={10} top={C.deskTop} front={C.deskFront} />
      <Monitor x={x + w / 2 - 28} y={y - 8} w={26} h={16} />
      <Monitor x={x + w / 2 + 2} y={y - 8} w={26} h={16} color={variant % 2 ? C.glowGreen : C.glow} />
      <rect x={x + w / 2 - 18} y={y + 14} width="36" height="5" fill="#2a2d34" />
      <rect x={x + w / 2 - 16} y={y + 15} width="32" height="1" fill="#565b66" />
      <rect x={x + w / 2 + 22} y={y + 14} width="4" height="5" fill="#2a2d34" />
      {variant % 3 === 0 ? <rect x={x + 8} y={y + 12} width="6" height="6" fill="#ece5d8" /> : <Plant x={x + 10} y={y + 2} small />}
      <Mug x={x + w - 12} y={y + 8} />
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
  switch (room.id) {
    case 'briefing':
      return (
        <g>
          <Projector x={x + 80} y={y + 1} w={120} />
          {Array.from({ length: 18 }, (_, i) => (
            <OfficeChair key={i} x={x + 50 + (i % 6) * 36} y={y + 76 + Math.floor(i / 6) * 26} />
          ))}
          <Cabinet x={x + w - 34} y={y + 52} />
          <Plant x={x + 18} y={y + 60} />
          <Plant x={x + 18} y={y + h - 30} />
        </g>
      );
    case 'meeting':
      return (
        <g>
          <WallScreen x={x + w / 2 - 50} y={y + 2} w={100} h={18} chart={1} />
          <rect x={x + 30} y={y + 4} width={50} height={14} fill={C.paper} />
          {Array.from({ length: 6 }, (_, i) => (
            <OfficeChair key={`t${i}`} x={x + 92 + i * 36} y={y + 74} />
          ))}
          <Box x={x + 70} y={y + 76} w={w - 140} d={36} h={8} top={C.deskTop} front={C.deskFront} />
          <rect className="screen" x={x + w / 2 - 20} y={y + 92} width="40" height="3" fill="#5eead4" opacity="0.8" />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={`b${i}`} transform={`rotate(180 ${x + 92 + i * 36} ${y + 132})`}>
              <OfficeChair x={x + 92 + i * 36} y={y + 132} />
            </g>
          ))}
          <Plant x={x + 18} y={y + 60} />
          <Plant x={x + w - 18} y={y + 60} />
        </g>
      );
    case 'approval':
      return (
        <g>
          <Shelf x={x + 14} y={y + 50} />
          <Cabinet x={x + 52} y={y + 58} />
          <rect x={x + 110} y={y + 60} width={140} height={90} fill="url(#rug)" opacity="0.6" />
          <Box x={x + 120} y={y + 70} w={120} d={26} h={10} top={C.deskTop} front={C.deskFront} />
          <Monitor x={x + 166} y={y + 58} />
          <rect x={x + 130} y={y + 78} width="16" height="11" fill={C.paper} />
          <circle cx={x + 222} cy={y + 76} r="12" fill="url(#glow-warm)" shapeRendering="auto" />
          <rect x={x + 218} y={y + 76} width="6" height="8" fill="#e8c46a" />
          <Mug x={x + 150} y={y + 82} />
          <Cabinet x={x + w - 34} y={y + 100} w={22} h={30} />
          <OfficeChair x={x + 180} y={y + 66} />
          <OfficeChair x={x + 160} y={y + 120} />
          <OfficeChair x={x + 200} y={y + 120} />
          <Plant x={x + w - 18} y={y + 60} />
        </g>
      );
    case 'workspace':
      return (
        <g>
          <Shelf x={x + 10} y={y + 26} />
          <Cabinet x={x + 10} y={y + 120} />
          {DESKS.map((d, i) => (
            <Desk key={i} x={d.x} y={d.y} variant={i} />
          ))}
          <Plant x={x + w - 18} y={y + 50} />
          <Plant x={x + w - 18} y={y + h - 28} />
          <rect x={x + w - 46} y={y + 26} width="20" height="16" fill="#3a3f4a" />
          <rect x={x + w - 43} y={y + 22} width="14" height="4" fill={C.paper} />
        </g>
      );
    case 'command':
      return (
        <g>
          <circle cx={x + w / 2} cy={y + 120} r="130" fill="url(#glow-blue)" shapeRendering="auto" />
          {/* Room for the name chip on the left, then the dashboard across the rest of the back wall. */}
          <DashboardWall x={x + 150} y={y + 4} w={w - 172} h={50} />
          <Cabinet x={x + 40} y={y + 48} w={26} h={38} />
          {CONSOLES.map((c, i) => (
            <g key={i}>
              <OfficeChair x={c.x + CONSOLE_W / 2} y={c.y - 4} />
              <Box x={c.x} y={c.y} w={CONSOLE_W} d={20} h={10} top={C.metalTop} front={C.metalFront} />
              {[0, 1, 2, 3, 4].map((k) => (
                <Monitor key={k} x={c.x + 8 + k * 32} y={c.y - 10} w={26} h={15} color={(k + i) % 2 ? C.glowGreen : C.glow} />
              ))}
              <rect x={c.x + 20} y={c.y + 13} width={CONSOLE_W - 40} height="4" fill="#2a2d34" />
            </g>
          ))}
          <Cabinet x={x + 12} y={y + 70} w={18} h={80} />
          <Cabinet x={x + w - 30} y={y + 70} w={18} h={80} />
        </g>
      );
    case 'lounge':
      return (
        <g>
          <WallScreen x={x + w / 2 - 20} y={y + 2} w={80} h={19} chart={1} />
          <rect x={x + 30} y={y + 58} width={w - 60} height={96} fill="url(#rug)" opacity="0.7" />
          <Sofa x={x + 50} y={y + 46} w={w - 100} />
          <Box x={x + w / 2 - 28} y={y + 92} w={56} d={20} h={6} top={C.deskTop} front={C.deskFront} />
          <Mug x={x + w / 2 - 14} y={y + 98} />
          <Plant x={x + w / 2 + 12} y={y + 96} small />
          <Armchair x={x + 22} y={y + 88} />
          <Armchair x={x + w - 46} y={y + 88} />
          <FloorLamp x={x + 24} y={y + 48} />
          <Shelf x={x + w - 42} y={y + 26} />
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
          <Box x={x + 46} y={y + 102} w={92} d={24} h={8} top={C.deskTop} front={C.deskFront} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x + 56 + i * 30} y={y + 136} width="10" height="8" fill="#2b2f39" />
          ))}
        </g>
      );
    case 'lab':
      return (
        <g>
          <Box x={x + 16} y={y + 44} w={w - 32} d={20} h={10} top="#c9cfd8" front="#6f7885" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={x + 34 + i * 38} y={y + 32} width="4" height="10" fill="#cbd5e1" />
              <rect x={x + 30 + i * 38} y={y + 42} width="12" height="8" fill={['#34d399', '#60a5fa', '#f472b6', '#facc15'][i]} opacity="0.85" />
            </g>
          ))}
          <Box x={x + 16} y={y + 100} w={w - 32} d={20} h={10} top="#c9cfd8" front="#6f7885" />
          <Monitor x={x + 40} y={y + 88} />
          <rect x={x + 100} y={y + 94} width="12" height="18" fill="#2a2e38" />
          <rect x={x + 102} y={y + 88} width="8" height="6" fill="#59647a" />
          <rect x={x + 130} y={y + 92} width={36} height={18} fill={C.paper} />
          <OfficeChair x={x + 52} y={y + 140} />
        </g>
      );
    case 'server':
      return (
        <g>
          {[0, 1].map((i) => (
            <g key={i}>
              <Box x={x + 16 + i * 56} y={y + 28} w={42} d={8} h={100} top="#3a4252" front="#14171e" />
              {Array.from({ length: 9 }, (_, j) => (
                <g key={j}>
                  <rect x={x + 20 + i * 56} y={y + 40 + j * 10} width="34" height="6" fill="#20242d" />
                  <rect
                    className="led"
                    x={x + 22 + i * 56}
                    y={y + 42 + j * 10}
                    width="2"
                    height="2"
                    fill={(i + j) % 4 === 0 ? '#f59e0b' : C.glowGreen}
                    style={{ animationDelay: `${((i * 9 + j) % 7) * 0.23}s` }}
                  />
                </g>
              ))}
            </g>
          ))}
          {/* Operator desk in front of the racks. */}
          <Box x={x + 66} y={y + 136} w={60} d={12} h={8} top={C.metalTop} front={C.metalFront} />
          <Monitor x={x + 70} y={y + 128} w={22} h={13} color={C.glowGreen} />
          <Monitor x={x + 98} y={y + 128} w={22} h={13} />
          <circle cx={x + 30} cy={y + 150} r="16" fill="url(#glow-warm)" shapeRendering="auto" />
          <Plant x={x + 24} y={y + 146} small />
        </g>
      );
    case 'rest':
      return (
        <g>
          {BEDS.map((b, i) => (
            <g key={i}>
              <Box x={b.x} y={b.y} w={50} d={50} h={6} top="#4a3a2e" front="#33281f" />
              <rect x={b.x + 3} y={b.y + 3} width={44} height={44} fill="#d9dee8" />
              <rect x={b.x + 9} y={b.y + 6} width={32} height={10} fill="#f4f6fa" />
              <rect x={b.x + 3} y={b.y + 24} width={44} height={23} fill={['#4f68b0', '#a24f6c', '#3f8268', '#a8743a'][i]} />
            </g>
          ))}
        </g>
      );
  }
}
