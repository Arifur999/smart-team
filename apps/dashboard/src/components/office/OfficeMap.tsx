'use client';

import { useEffect, useRef, useState } from 'react';
import { lookOf } from '@/lib/characters';
import {
  BEDS,
  CONSOLE_W,
  CONSOLES,
  DESK_W,
  DESKS,
  MAP_H,
  MAP_W,
  ROOMS,
  type OfficeMember,
  type Room,
  type RoomId,
} from '@/lib/office';
import { speechFor } from '@/lib/speech';
import { PixelSprite } from './PixelSprite';

// Night-time palette, the same in both themes, like the terminal.
const C = {
  corridor: '#23262d',
  wallTop: '#4a5163',
  wallFace: '#2b303c',
  wallEdge: '#0d0f14',
  glass: '#7fb2d9',
  label: '#b9c2d6',
  woodTop: '#8b6646',
  woodFront: '#5a412d',
  metalTop: '#6f7b91',
  metalFront: '#3a4252',
  screen: '#0a1220',
  glow: '#4f8cff',
  glowGreen: '#34d399',
  fabricTop: '#4c4f6b',
  fabric: '#36384f',
  plant: '#2f7a4b',
  plantLight: '#43a066',
  pot: '#7a4e33',
  paper: '#e7eaf0',
  lamp: '#ffd27a',
  occupied: '#8b7cf6',
};

const FLOOR: Record<RoomId, string> = {
  briefing: 'carpet-blue',
  meeting: 'carpet-blue',
  approval: 'wood',
  workspace: 'wood',
  command: 'tile-dark',
  lounge: 'wood-warm',
  pantry: 'tile-light',
  lab: 'tile-light',
  server: 'tile-dark',
  rest: 'carpet-plum',
};

interface Props {
  members: OfficeMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function OfficeMap({ members, selectedId, onSelect }: Props) {
  const tick = useTick(7_000);
  const counts = new Map<RoomId, number>();
  for (const m of members) counts.set(m.activity.room, (counts.get(m.activity.room) ?? 0) + 1);

  return (
    // `isolate` keeps the characters' depth sorting (z-index by y) inside the map, under dialogs and cards.
    <div
      className="@container relative isolate w-full overflow-hidden rounded-xl border border-black/60 bg-[#14161b] shadow-inner"
      style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
    >
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 size-full" shapeRendering="crispEdges" role="img" aria-label="Office map">
        <Patterns />
        <rect width={MAP_W} height={MAP_H} fill="url(#corridor)" />
        {ROOMS.map((room) => (
          <RoomShape key={room.id} room={room} count={counts.get(room.id) ?? 0} />
        ))}
      </svg>

      {members.map((m) => (
        <Character key={m.id} member={m} tick={tick} selected={m.id === selectedId} onSelect={() => onSelect(m.id)} />
      ))}
    </div>
  );
}

function Patterns() {
  return (
    <defs>
      <pattern id="corridor" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#1f2228" />
        <rect width="31" height="31" fill={C.corridor} />
        <rect x="2" y="2" width="6" height="1" fill="#2c3038" />
      </pattern>
      <pattern id="wood" width="48" height="12" patternUnits="userSpaceOnUse">
        <rect width="48" height="12" fill="#3d2e22" />
        <rect y="11" width="48" height="1" fill="#2a1f17" />
        <rect x="30" width="1" height="11" fill="#2a1f17" />
        <rect x="4" y="3" width="14" height="1" fill="#4a382a" />
      </pattern>
      <pattern id="wood-warm" width="48" height="12" patternUnits="userSpaceOnUse">
        <rect width="48" height="12" fill="#4a3320" />
        <rect y="11" width="48" height="1" fill="#33231a" />
        <rect x="18" width="1" height="11" fill="#33231a" />
      </pattern>
      <pattern id="tile-dark" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#1a1e27" />
        <rect width="19" height="19" fill="#222837" />
      </pattern>
      <pattern id="tile-light" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#2b313c" />
        <rect width="19" height="19" fill="#353c49" />
      </pattern>
      <pattern id="carpet-blue" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#1e2740" />
        <rect width="1" height="1" fill="#28335a" />
      </pattern>
      <pattern id="carpet-plum" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#2a1f33" />
        <rect width="1" height="1" fill="#3a2b46" />
      </pattern>
      <radialGradient id="glow-warm" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={C.lamp} stopOpacity="0.32" />
        <stop offset="100%" stopColor={C.lamp} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow-blue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function RoomShape({ room, count }: { room: Room; count: number }) {
  const { x, y, w, h } = room;
  const BACK = 24;
  const door = { x: x + w / 2 - 18, w: 36 };
  const occupied = count > 0;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${FLOOR[room.id]})`} />
      {occupied && <rect x={x} y={y} width={w} height={h} fill={C.occupied} opacity="0.06" />}

      {/* Back wall: lit top edge over a darker face, with a soft shadow on the floor. */}
      <rect x={x} y={y} width={w} height={BACK} fill={C.wallFace} />
      <rect x={x} y={y} width={w} height={4} fill={C.wallTop} />
      <rect x={x} y={y + BACK} width={w} height={3} fill="#000" opacity="0.35" />

      {/* Wall lamps with a warm pool of light. */}
      {[0.2, 0.8].map((f) => (
        <g key={f}>
          <circle cx={x + w * f} cy={y + BACK + 18} r="34" fill="url(#glow-warm)" shapeRendering="auto" />
          <rect className="lamp" x={x + w * f - 3} y={y + 8} width="6" height="8" fill={C.lamp} />
          <rect x={x + w * f - 4} y={y + 6} width="8" height="2" fill="#6b5b3a" />
        </g>
      ))}

      {/* Glass front wall with a door gap in the middle. */}
      <rect x={x} y={y + h - 6} width={door.x - x} height="6" fill={C.glass} opacity="0.35" />
      <rect x={door.x + door.w} y={y + h - 6} width={x + w - door.x - door.w} height="6" fill={C.glass} opacity="0.35" />
      {Array.from({ length: Math.floor(w / 40) }, (_, i) => x + 20 + i * 40)
        .filter((mx) => mx < door.x - 2 || mx > door.x + door.w + 2)
        .map((mx) => (
          <rect key={mx} x={mx} y={y + h - 6} width="2" height="6" fill="#2c3646" />
        ))}
      <rect x={door.x} y={y + h - 2} width={door.w} height="2" fill="#151820" />

      {/* Side walls. */}
      <rect x={x} y={y} width="4" height={h} fill={C.wallEdge} />
      <rect x={x + w - 4} y={y} width="4" height={h} fill={C.wallEdge} />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={occupied ? C.occupied : C.wallEdge} strokeWidth={occupied ? 2 : 1} opacity={occupied ? 0.8 : 1} />

      <text x={x + 10} y={y + 17} fill={C.label} fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="1.2" fontWeight="600">
        {room.label.toUpperCase()}
        {occupied ? ` · ${count}` : ''}
      </text>

      <Furniture room={room} />
    </g>
  );
}

/** Furniture seen from above and a little in front: top face, darker front face, soft shadow. */
function Box({ x, y, w, d, h, top, front }: { x: number; y: number; w: number; d: number; h: number; top: string; front: string }) {
  return (
    <g>
      <rect x={x + 2} y={y + d + h} width={w} height="3" fill="#000" opacity="0.3" />
      <rect x={x} y={y + d} width={w} height={h} fill={front} />
      <rect x={x} y={y} width={w} height={d} fill={top} />
      <rect x={x} y={y} width={w} height="1" fill="#fff" opacity="0.12" />
    </g>
  );
}

function Monitor({ x, y, w = 24, h = 16, color = C.glow }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  return (
    <g>
      <rect x={x + w / 2 - 2} y={y + h} width="4" height="3" fill="#1b1f27" />
      <rect x={x} y={y} width={w} height={h} fill="#12151c" />
      <rect className="screen" x={x + 1} y={y + 1} width={w - 2} height={h - 2} fill={C.screen} />
      <rect className="screen" x={x + 3} y={y + 3} width={Math.round((w - 6) * 0.7)} height="1" fill={color} />
      <rect className="screen" x={x + 3} y={y + 6} width={Math.round((w - 6) * 0.45)} height="1" fill={color} opacity="0.7" />
      <rect className="screen" x={x + 3} y={y + 9} width={Math.round((w - 6) * 0.8)} height="1" fill={color} opacity="0.5" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 5} y={y + 4} width="10" height="9" fill={C.pot} />
      <rect x={x - 6} y={y + 3} width="12" height="2" fill="#93613f" />
      <rect x={x - 7} y={y - 6} width="6" height="9" fill={C.plant} />
      <rect x={x + 1} y={y - 7} width="6" height="10" fill={C.plant} />
      <rect x={x - 3} y={y - 11} width="6" height="10" fill={C.plantLight} />
    </g>
  );
}

function Chair({ x, y, color = '#2b303d' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <rect x={x - 7} y={y - 9} width="14" height="6" fill={color} />
      <rect x={x - 8} y={y - 4} width="16" height="8" fill={shadeHex(color, 0.15)} />
      <rect x={x - 1} y={y + 4} width="2" height="3" fill="#15181e" />
    </g>
  );
}

function Shelf({ x, y }: { x: number; y: number }) {
  const books = ['#b3463c', '#3f6fd0', '#e0b24a', '#2f8a5b', '#8a5ad0', '#c86a3a'];
  return (
    <g>
      <Box x={x} y={y} w={30} d={6} h={46} top={C.woodTop} front={C.woodFront} />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4].map((i) => <rect key={`${row}-${i}`} x={x + 3 + i * 5} y={y + 9 + row * 14} width="4" height="10" fill={books[(i + row * 2) % books.length]} />),
      )}
    </g>
  );
}

function Furniture({ room }: { room: Room }) {
  const { x, y, w, h } = room;
  switch (room.id) {
    case 'briefing':
      return (
        <g>
          <rect x={x + 70} y={y + 30} width={140} height={54} fill={C.paper} />
          <rect x={x + 70} y={y + 30} width={140} height="3" fill="#9aa3b2" />
          <rect x={x + 80} y={y + 42} width={70} height="4" fill="#7c8aa3" />
          <rect x={x + 80} y={y + 52} width={110} height="3" fill="#b8c2d3" />
          <rect x={x + 80} y={y + 60} width={90} height="3" fill="#b8c2d3" />
          <rect x={x + 134} y={y + 96} width="12" height="8" fill="#3a4252" />
          {Array.from({ length: 10 }, (_, i) => (
            <Chair key={i} x={x + 44 + (i % 5) * 48} y={y + 124 + Math.floor(i / 5) * 24} color="#2b3756" />
          ))}
          <Plant x={x + w - 18} y={y + 46} />
        </g>
      );
    case 'meeting':
      return (
        <g>
          <rect x={x + 30} y={y + 30} width={70} height={36} fill={C.paper} />
          <rect x={x + 36} y={y + 38} width={40} height="2" fill="#7c8aa3" />
          <rect x={x + w - 110} y={y + 30} width={80} height={36} fill="#0a0f1a" />
          <rect className="screen" x={x + w - 106} y={y + 34} width={72} height={28} fill="#16294a" />
          {Array.from({ length: 6 }, (_, i) => (
            <Chair key={`a${i}`} x={x + 92 + i * 36} y={y + 98} color="#3a3350" />
          ))}
          <Box x={x + 70} y={y + 98} w={w - 140} d={34} h={10} top={C.woodTop} front={C.woodFront} />
          <rect className="screen" x={x + w / 2 - 2} y={y + 106} width="4" height="18" fill="#5eead4" opacity="0.7" />
          <Plant x={x + 18} y={y + 150} />
          <Plant x={x + w - 18} y={y + 150} />
        </g>
      );
    case 'approval':
      return (
        <g>
          <Shelf x={x + 18} y={y + 32} />
          <Shelf x={x + 52} y={y + 32} />
          <Box x={x + 110} y={y + 86} w={120} d={28} h={12} top={C.woodTop} front={C.woodFront} />
          <Monitor x={x + 150} y={y + 72} />
          <rect x={x + 122} y={y + 94} width="16" height="11" fill={C.paper} />
          <rect x={x + 206} y={y + 92} width="6" height="8" fill="#e8c46a" />
          <Chair x={x + 170} y={y + 140} color="#3a3f4f" />
          <Plant x={x + w - 20} y={y + 46} />
        </g>
      );
    case 'workspace':
      return (
        <g>
          <Shelf x={x + 10} y={y + 30} />
          {DESKS.map((d, i) => (
            <g key={i}>
              <Chair x={d.x + DESK_W / 2} y={d.y - 2} />
              <Box x={d.x} y={d.y} w={DESK_W} d={24} h={11} top={C.woodTop} front={C.woodFront} />
              <Monitor x={d.x + 20} y={d.y - 9} w={28} h={17} />
              <Monitor x={d.x + 52} y={d.y - 9} w={28} h={17} color={i % 2 ? C.glowGreen : C.glow} />
              <rect x={d.x + 30} y={d.y + 15} width={38} height="5" fill="#c9ced8" />
              <rect x={d.x + 84} y={d.y + 14} width="6" height="6" fill="#ece5d8" />
            </g>
          ))}
          <Plant x={x + w - 18} y={y + 46} />
          <Plant x={x + w - 18} y={y + h - 30} />
        </g>
      );
    case 'command':
      return (
        <g>
          <rect x={x + 24} y={y + 30} width={w - 48} height={56} fill="#081020" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect className="screen" x={x + 30 + i * ((w - 60) / 4)} y={y + 34} width={(w - 60) / 4 - 6} height={48} fill={i === 1 ? '#0e2a3f' : '#0f1d36'} />
              <polyline
                className="screen"
                points={Array.from({ length: 7 }, (_, k) => `${x + 36 + i * ((w - 60) / 4) + k * 15},${y + 70 - ((k * 7 + i * 11) % 26)}`).join(' ')}
                fill="none"
                stroke={i % 2 ? C.glowGreen : C.glow}
                strokeWidth="2"
              />
            </g>
          ))}
          <circle cx={x + w / 2} cy={y + 110} r="90" fill="url(#glow-blue)" shapeRendering="auto" />
          {CONSOLES.map((c, i) => (
            <g key={i}>
              <Box x={c.x} y={c.y} w={CONSOLE_W} d={20} h={10} top={C.metalTop} front={C.metalFront} />
              {[0, 1, 2, 3, 4].map((k) => (
                <Monitor key={k} x={c.x + 8 + k * 32} y={c.y - 10} w={26} h={15} color={(k + i) % 2 ? C.glowGreen : C.glow} />
              ))}
              <rect x={c.x + 20} y={c.y + 12} width={CONSOLE_W - 40} height="4" fill="#9aa3b2" />
            </g>
          ))}
          <rect x={x + 14} y={y + 100} width="16" height="70" fill="#1c2029" />
          {[0, 1, 2, 3, 4].map((j) => (
            <rect key={j} className="led" x={x + 18} y={y + 106 + j * 12} width="3" height="3" fill={C.glowGreen} style={{ animationDelay: `${j * 0.3}s` }} />
          ))}
        </g>
      );
    case 'lounge':
      return (
        <g>
          <rect x={x + 70} y={y + 30} width={90} height={46} fill="#0a0f18" />
          <rect className="screen" x={x + 74} y={y + 34} width={82} height={38} fill="#1b2d4f" />
          <Box x={x + 24} y={y + 96} w={92} d={18} h={12} top={C.fabricTop} front={C.fabric} />
          <rect x={x + 24} y={y + 88} width={92} height="10" fill={shadeHex(C.fabric, -0.2)} />
          <Box x={x + 134} y={y + 96} w={92} d={18} h={12} top={C.fabricTop} front={C.fabric} />
          <rect x={x + 134} y={y + 88} width={92} height="10" fill={shadeHex(C.fabric, -0.2)} />
          <Box x={x + 104} y={y + 122} w={42} d={14} h={6} top={C.woodTop} front={C.woodFront} />
          <Plant x={x + 20} y={y + 46} />
          <Plant x={x + w - 20} y={y + 46} />
        </g>
      );
    case 'pantry':
      return (
        <g>
          <Box x={x + 14} y={y + 32} w={30} d={10} h={60} top="#d7dbe2" front="#a8afbb" />
          <rect x={x + 38} y={y + 52} width="2" height="16" fill="#6b7280" />
          <Box x={x + 56} y={y + 48} w={w - 70} d={18} h={22} top="#c4cad4" front="#5f6775" />
          <rect x={x + 66} y={y + 36} width="16" height="16" fill="#2b2f38" />
          <rect x={x + 72} y={y + 42} width="4" height="4" fill="#ef4444" />
          <rect x={x + 96} y={y + 40} width="8" height="10" fill="#ece5d8" />
          <rect x={x + 120} y={y + 38} width="22" height="12" fill="#3b82f6" opacity="0.6" />
          <Box x={x + 50} y={y + 104} w={86} d={24} h={8} top={C.woodTop} front={C.woodFront} />
          <rect x={x + 62} y={y + 110} width="6" height="6" fill="#ece5d8" />
        </g>
      );
    case 'lab':
      return (
        <g>
          <Box x={x + 18} y={y + 46} w={w - 36} d={20} h={10} top="#cfd5de" front="#79828f" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={x + 34 + i * 38} y={y + 34} width="4" height="10" fill="#cbd5e1" />
              <rect x={x + 30 + i * 38} y={y + 44} width="12" height="8" fill={['#34d399', '#60a5fa', '#f472b6', '#facc15'][i]} opacity="0.85" />
            </g>
          ))}
          <Box x={x + 18} y={y + 104} w={w - 36} d={20} h={10} top="#cfd5de" front="#79828f" />
          <Monitor x={x + 40} y={y + 92} />
          <rect x={x + 100} y={y + 98} width="12" height="18" fill="#3a4252" />
          <rect x={x + 102} y={y + 92} width="8" height="6" fill="#59647a" />
          <rect x={x + 130} y={y + 96} width={36} height={18} fill={C.paper} />
        </g>
      );
    case 'server':
      return (
        <g>
          {[0, 1].map((i) => (
            <g key={i}>
              <Box x={x + 18 + i * 54} y={y + 34} w={40} d={8} h={92} top="#3a4252" front="#1a1e27" />
              {Array.from({ length: 8 }, (_, j) => (
                <g key={j}>
                  <rect x={x + 22 + i * 54} y={y + 46 + j * 10} width="32" height="6" fill="#262b36" />
                  <rect
                    className="led"
                    x={x + 24 + i * 54}
                    y={y + 48 + j * 10}
                    width="2"
                    height="2"
                    fill={(i + j) % 4 === 0 ? '#f59e0b' : C.glowGreen}
                    style={{ animationDelay: `${((i * 8 + j) % 7) * 0.23}s` }}
                  />
                </g>
              ))}
            </g>
          ))}
        </g>
      );
    case 'rest':
      return (
        <g>
          {BEDS.map((b, i) => (
            <g key={i}>
              <Box x={b.x} y={b.y} w={50} d={50} h={6} top="#6b4f3a" front="#4a3627" />
              <rect x={b.x + 3} y={b.y + 3} width={44} height={44} fill="#e6eaf1" />
              <rect x={b.x + 9} y={b.y + 6} width={32} height={10} fill="#ffffff" />
              <rect x={b.x + 3} y={b.y + 24} width={44} height={23} fill={['#5b7bd5', '#c2557a', '#4f9a7a', '#c98a3a'][i]} />
            </g>
          ))}
        </g>
      );
  }
}

function Character({ member, tick, selected, onSelect }: { member: OfficeMember; tick: number; selected: boolean; onSelect: () => void }) {
  const { activity } = member;
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const lastPos = useRef(member.position);

  const left = (member.position.x / MAP_W) * 100;
  const top = (member.position.y / MAP_H) * 100;
  const pose = walking ? 'walk' : activity.pose;
  const speech = walking ? null : speechFor(member, tick);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${member.name}, ${member.title}: ${activity.label}`}
      aria-pressed={selected}
      // Walking is driven by the CSS transition itself, so the legs move exactly while the character does.
      onTransitionRun={(e) => {
        if (e.propertyName !== 'left' && e.propertyName !== 'top') return;
        setFacingLeft(member.position.x < lastPos.current.x);
        lastPos.current = member.position;
        setWalking(true);
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'left' || e.propertyName === 'top') setWalking(false);
      }}
      className="group absolute flex -translate-x-1/2 -translate-y-full flex-col items-center transition-[left,top] duration-[2000ms] ease-in-out focus-visible:outline-none"
      style={{ left: `${left}%`, top: `${top}%`, zIndex: Math.round(member.position.y) }}
    >
      {speech && (
        <span
          key={speech}
          className={`bubble-in relative mb-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[clamp(9px,0.95cqw,12px)] leading-tight shadow-lg ${
            activity.tone === 'waiting' ? 'border-amber-300/60 bg-amber-950/90 text-amber-100' : 'border-indigo-300/50 bg-[#1d1b3a]/95 text-indigo-100'
          }`}
        >
          {speech}
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-inherit bg-inherit" aria-hidden />
        </span>
      )}
      {activity.tone === 'off' && (
        <span className="zzz pointer-events-none absolute -right-2 top-0 rounded bg-sky-950/80 px-1 font-mono text-[10px] font-bold text-sky-200" aria-hidden>
          zZ
        </span>
      )}

      {/* Hover card, like a game tooltip: name · role · status. */}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-8 hidden -translate-x-1/2 whitespace-nowrap rounded border border-white/15 bg-white px-2 py-0.5 text-[11px] text-black shadow-lg group-hover:block">
        {member.name.toLowerCase()} · {member.title} · {activity.label.toLowerCase()}
      </span>

      <span
        className={`relative ${selected ? 'drop-shadow-[0_0_5px_rgba(167,139,250,1)]' : 'group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]'}`}
        style={{ transform: walking && facingLeft ? 'scaleX(-1)' : undefined }}
      >
        {/* Sized in container units so characters grow and shrink with the map. */}
        <PixelSprite look={lookOf(member.id)} pose={pose} size={30} className="!h-[clamp(48px,6.2cqw,96px)] !w-[clamp(28px,3.6cqw,56px)]" />
      </span>
      <span className="-mt-0.5 max-w-[clamp(64px,7cqw,110px)] truncate px-1 font-mono text-[clamp(9px,0.95cqw,12px)] font-semibold leading-tight text-white [text-shadow:0_1px_2px_#000]">
        {member.name}
      </span>
    </button>
  );
}

/** A counter that goes up every `ms`, so speech bubbles change now and then. */
function useTick(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}

function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `#${((mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)).toString(16).padStart(6, '0')}`;
}
