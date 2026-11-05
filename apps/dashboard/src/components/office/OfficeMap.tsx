'use client';

import { useRef, useState } from 'react';
import { lookOf } from '@/lib/characters';
import { BEDS, DESK_W, DESKS, MAP_H, MAP_W, ROOMS, type OfficeMember, type Room, type RoomId } from '@/lib/office';
import { CharacterSprite } from './CharacterSprite';

// The office is always drawn at night, in both themes, like the terminal.
const C = {
  wallTop: '#566079',
  wallFace: '#2a303d',
  wallEdge: '#11141b',
  label: '#aab4c8',
  wood: '#8a6544',
  woodTop: '#a27a53',
  woodFront: '#5e4330',
  metal: '#59647a',
  metalTop: '#7a869c',
  metalFront: '#3a4252',
  screen: '#0b1220',
  glow: '#4f8cff',
  glowGreen: '#34d399',
  fabric: '#46405e',
  fabricTop: '#5a5378',
  plant: '#2f7a4b',
  plantLight: '#3f9a60',
  pot: '#8a5a3c',
  white: '#e7eaf0',
};

const FLOOR: Record<RoomId, string> = {
  briefing: 'carpet-blue',
  command: 'tile-dark',
  approval: 'wood',
  workspace: 'wood',
  lab: 'tile-light',
  server: 'tile-dark',
  meeting: 'carpet-blue',
  lounge: 'wood-warm',
  pantry: 'tile-light',
  rest: 'carpet-plum',
};

interface Props {
  members: OfficeMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function OfficeMap({ members, selectedId, onSelect }: Props) {
  return (
    // `isolate` keeps the characters' depth sorting (z-index by y) inside the map, under dialogs and cards.
    <div className="@container relative isolate w-full overflow-hidden rounded-xl border border-black/50 bg-[#0c0e13] shadow-inner" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 size-full" role="img" aria-label="Office map">
        <FloorPatterns />
        {ROOMS.map((room) => (
          <RoomShape key={room.id} room={room} />
        ))}
      </svg>

      {members.map((m) => (
        <Character key={m.id} member={m} selected={m.id === selectedId} onSelect={() => onSelect(m.id)} />
      ))}
    </div>
  );
}

function FloorPatterns() {
  return (
    <defs>
      <pattern id="wood" width="60" height="14" patternUnits="userSpaceOnUse">
        <rect width="60" height="14" fill="#3b2c22" />
        <rect y="13" width="60" height="1" fill="#2a1f18" />
        <rect x="40" width="1" height="14" fill="#2a1f18" />
        <rect x="6" y="4" width="18" height="1" fill="#453428" opacity="0.6" />
      </pattern>
      <pattern id="wood-warm" width="60" height="14" patternUnits="userSpaceOnUse">
        <rect width="60" height="14" fill="#47331f" />
        <rect y="13" width="60" height="1" fill="#33241a" />
        <rect x="22" width="1" height="14" fill="#33241a" />
      </pattern>
      <pattern id="tile-dark" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#1d222d" />
        <rect width="23" height="23" fill="#222836" />
      </pattern>
      <pattern id="tile-light" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#2c323d" />
        <rect width="23" height="23" fill="#343b48" />
      </pattern>
      <pattern id="carpet-blue" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#1f2840" />
        <circle cx="2" cy="2" r="0.7" fill="#2a3556" />
      </pattern>
      <pattern id="carpet-plum" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#2b2033" />
        <circle cx="2" cy="2" r="0.7" fill="#3a2b45" />
      </pattern>
      <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function RoomShape({ room }: { room: Room }) {
  const { x, y, w, h } = room;
  const BACK = 26;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${FLOOR[room.id]})`} />
      {/* The back wall gives the room its depth: a lit top edge over a darker face. */}
      <rect x={x} y={y} width={w} height={BACK} fill={C.wallFace} />
      <rect x={x} y={y} width={w} height={4} fill={C.wallTop} />
      <rect x={x} y={y + BACK - 3} width={w} height={3} fill="#000" opacity="0.35" />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.wallEdge} strokeWidth="5" />
      <rect x={x + 2.5} y={y + 2.5} width={w - 5} height={h - 5} fill="none" stroke={C.wallTop} strokeWidth="1" opacity="0.5" />
      <text x={x + 10} y={y + 18} fill={C.label} fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="1.2">
        {room.label.toUpperCase()}
      </text>
      <Furniture room={room} />
    </g>
  );
}

/** A piece of furniture seen from above and a little in front: top face, front face, soft shadow. */
function Box({ x, y, w, d, h, top, front, r = 2 }: { x: number; y: number; w: number; d: number; h: number; top: string; front: string; r?: number }) {
  return (
    <g>
      <rect x={x + 2} y={y + d + h - 1} width={w} height="4" rx="2" fill="#000" opacity="0.3" />
      <rect x={x} y={y + d - r} width={w} height={h + r} rx={r} fill={front} />
      <rect x={x} y={y} width={w} height={d} rx={r} fill={top} />
    </g>
  );
}

function Monitor({ x, y, w = 26, h = 17, color = C.glow }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  return (
    <g>
      <rect x={x + w / 2 - 2} y={y + h} width="4" height="4" fill="#20242c" />
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill="#15181f" />
      <rect className="screen" x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} rx="1" fill={C.screen} />
      <rect className="screen" x={x + 3} y={y + 4} width={(w - 6) * 0.7} height="1.4" fill={color} opacity="0.85" />
      <rect className="screen" x={x + 3} y={y + 7} width={(w - 6) * 0.5} height="1.4" fill={color} opacity="0.6" />
      <rect className="screen" x={x + 3} y={y + 10} width={(w - 6) * 0.8} height="1.4" fill={color} opacity="0.45" />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="14" rx="8" ry="2.5" fill="#000" opacity="0.3" />
      <path d="M-6 4 L6 4 L4.5 14 L-4.5 14 Z" fill={C.pot} />
      <circle cx="-4" cy="-1" r="5.5" fill={C.plant} />
      <circle cx="4" cy="-2" r="5.5" fill={C.plant} />
      <circle cx="0" cy="-7" r="6" fill={C.plantLight} />
    </g>
  );
}

function Chair({ x, y, color = '#2f3544' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <rect x={x - 8} y={y - 10} width="16" height="7" rx="3" fill={color} />
      <rect x={x - 9} y={y - 4} width="18" height="9" rx="3.5" fill={shadeHex(color, 0.15)} />
    </g>
  );
}

function Furniture({ room }: { room: Room }) {
  const { x, y, w, h } = room;
  switch (room.id) {
    case 'briefing':
      return (
        <g>
          <rect x={x + 70} y={y + 30} width={140} height={58} rx="2" fill={C.white} opacity="0.92" />
          <rect x={x + 80} y={y + 40} width={60} height="4" fill="#94a3b8" />
          <rect x={x + 80} y={y + 50} width={100} height="3" fill="#cbd5e1" />
          <rect x={x + 80} y={y + 58} width={80} height="3" fill="#cbd5e1" />
          <path d={`M${x + 140} ${y + 115} l-8 -20 l16 0 Z`} fill="#3a4252" />
          {Array.from({ length: 8 }, (_, i) => (
            <Chair key={i} x={x + 70 + (i % 4) * 46} y={y + 128 + Math.floor(i / 4) * 26} color="#2d3a58" />
          ))}
          <Plant x={x + 255} y={y + 160} />
        </g>
      );
    case 'command':
      return (
        <g>
          <rect x={x + 30} y={y + 30} width={w - 60} height={56} rx="2" fill="#0a0f1a" stroke="#1f3b6e" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect className="screen" x={x + 40 + i * 98} y={y + 36} width={88} height={44} rx="1" fill="#0f1d36" />
              <polyline
                className="screen"
                points={Array.from({ length: 8 }, (_, k) => `${x + 44 + i * 98 + k * 11},${y + 70 - ((k * 7 + i * 13) % 26)}`).join(' ')}
                fill="none"
                stroke={i === 1 ? C.glowGreen : C.glow}
                strokeWidth="1.6"
              />
            </g>
          ))}
          <Box x={x + 40} y={y + 112} w={w - 80} d={18} h={10} top={C.metalTop} front={C.metalFront} />
          {[0, 1, 2, 3].map((i) => (
            <Monitor key={i} x={x + 60 + i * 64} y={y + 98} w={24} h={15} color={i % 2 ? C.glowGreen : C.glow} />
          ))}
        </g>
      );
    case 'approval':
      return (
        <g>
          <Box x={x + 90} y={y + 96} w={130} d={30} h={14} top={C.woodTop} front={C.woodFront} />
          <Monitor x={x + 140} y={y + 84} />
          <rect x={x + 108} y={y + 104} width="18" height="12" rx="1" fill={C.white} transform={`rotate(-8 ${x + 117} ${y + 110})`} />
          <rect x={x + 20} y={y + 34} width={44} height={70} fill={C.woodFront} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={x + 22} y={y + 38 + i * 22} width={40} height="2" fill={C.wood} />
              {[0, 1, 2, 3, 4].map((k) => (
                <rect key={k} x={x + 25 + k * 7} y={y + 26 + i * 22} width="5" height="12" fill={['#b3261e', '#3f6fd0', '#e8b33b', '#2f7a4b', '#a855f7'][(k + i) % 5]} />
              ))}
            </g>
          ))}
          <Plant x={x + 270} y={y + 150} s={1.2} />
          <circle cx={x + 250} cy={y + 60} r="40" fill="url(#lamp)" />
        </g>
      );
    case 'workspace':
      return (
        <g>
          {DESKS.map((d, i) => (
            <g key={i}>
              <Chair x={d.x + DESK_W / 2} y={d.y - 2} />
              <Box x={d.x} y={d.y} w={DESK_W} d={26} h={12} top={C.woodTop} front={C.woodFront} />
              <Monitor x={d.x + 18} y={d.y - 10} w={28} h={18} />
              <Monitor x={d.x + 50} y={d.y - 10} w={28} h={18} color={i % 2 ? C.glowGreen : C.glow} />
              <rect x={d.x + 30} y={d.y + 15} width={36} height={6} rx="1" fill="#c9ced8" />
              <circle cx={d.x + 82} cy={d.y + 18} r="3" fill="#e8e1d6" />
            </g>
          ))}
          <Plant x={x + w - 20} y={y + 48} />
          <Plant x={x + 20} y={y + h - 22} s={0.9} />
        </g>
      );
    case 'lab':
      return (
        <g>
          <Box x={x + 20} y={y + 50} w={w - 40} d={24} h={12} top="#cfd5de" front="#7c8594" />
          <Box x={x + 20} y={y + 120} w={w - 40} d={24} h={12} top="#cfd5de" front="#7c8594" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <path d={`M${x + 40 + i * 38} ${y + 46} l-5 12 l10 0 Z`} fill={['#34d399', '#60a5fa', '#f472b6', '#facc15', '#a78bfa'][i]} opacity="0.85" />
              <rect x={x + 38 + i * 38} y={y + 38} width="4" height="8" fill="#cbd5e1" />
            </g>
          ))}
          <Monitor x={x + 60} y={y + 110} />
          <rect x={x + 130} y={y + 112} width="12" height="18" rx="2" fill="#3a4252" />
          <circle cx={x + 136} cy={y + 110} r="5" fill="#59647a" />
          <rect x={x + 160} y={y + 108} width={40} height={20} rx="2" fill={C.white} opacity="0.9" />
        </g>
      );
    case 'server':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <Box x={x + 18 + i * 48} y={y + 40} w={36} d={10} h={100} top="#3a4252" front="#1c2029" />
              {Array.from({ length: 8 }, (_, j) => (
                <g key={j}>
                  <rect x={x + 22 + i * 48} y={y + 56 + j * 11} width="28" height="7" rx="1" fill="#262b36" />
                  <circle className="led" cx={x + 26 + i * 48} cy={y + 59.5 + j * 11} r="1.4" fill={(i + j) % 4 === 0 ? '#f59e0b' : C.glowGreen} style={{ animationDelay: `${((i * 8 + j) % 7) * 0.23}s` }} />
                </g>
              ))}
            </g>
          ))}
        </g>
      );
    case 'meeting':
      return (
        <g>
          <rect x={x + 30} y={y + 32} width={90} height={30} rx="1" fill={C.white} opacity="0.85" />
          {Array.from({ length: 5 }, (_, i) => (
            <Chair key={`t${i}`} x={x + 70 + i * 42} y={y + 84} color="#3b3550" />
          ))}
          <Box x={x + 45} y={y + 86} w={w - 90} d={40} h={12} r={8} top={C.woodTop} front={C.woodFront} />
          <circle cx={x + 90} cy={y + 104} r="4" fill="#e8e1d6" />
          <rect x={x + 160} y={y + 98} width="20" height="14" rx="1" fill="#1b2130" />
          <Plant x={x + w - 22} y={y + 50} />
        </g>
      );
    case 'lounge':
      return (
        <g>
          <rect x={x + 120} y={y + 30} width={90} height={50} rx="2" fill="#0b0f18" stroke="#2a3346" />
          <rect className="screen" x={x + 124} y={y + 34} width={82} height={42} fill="#1a2b4a" />
          <Box x={x + 30} y={y + 92} w={110} d={22} h={14} r={6} top={C.fabricTop} front={C.fabric} />
          <rect x={x + 30} y={y + 84} width={110} height={12} rx="6" fill={shadeHex(C.fabric, -0.15)} />
          <Box x={x + 190} y={y + 92} w={110} d={22} h={14} r={6} top={C.fabricTop} front={C.fabric} />
          <rect x={x + 190} y={y + 84} width={110} height={12} rx="6" fill={shadeHex(C.fabric, -0.15)} />
          <Box x={x + 150} y={y + 104} w={30} d={18} h={8} top={C.woodTop} front={C.woodFront} />
          <Plant x={x + 20} y={y + 50} />
          <Plant x={x + w - 18} y={y + 50} s={1.1} />
          <circle cx={x + 165} cy={y + 120} r="60" fill="url(#lamp)" />
        </g>
      );
    case 'pantry':
      return (
        <g>
          <Box x={x + 12} y={y + 34} w={34} d={12} h={58} top="#d7dbe2" front="#aab1bd" />
          <rect x={x + 40} y={y + 56} width="2" height="16" fill="#6b7280" />
          <Box x={x + 56} y={y + 52} w={w - 68} d={20} h={22} top="#c9ced8" front="#6b7280" />
          <rect x={x + 64} y={y + 42} width="16" height="16" rx="2" fill="#2b2f38" />
          <circle cx={x + 72} cy={y + 50} r="2" fill="#ef4444" />
          <rect x={x + 90} y={y + 46} width="8" height="10" rx="1" fill="#e8e1d6" />
          <Box x={x + 40} y={y + 110} w={70} d={26} h={10} r={12} top={C.woodTop} front={C.woodFront} />
          <rect x={x + 52} y={y + 116} width="7" height="7" rx="3.5" fill="#e8e1d6" />
        </g>
      );
    case 'rest':
      return (
        <g>
          {BEDS.map((b, i) => (
            <g key={i}>
              <Box x={b.x} y={b.y} w={52} d={50} h={8} r={4} top="#6b4f3a" front="#4a3627" />
              <rect x={b.x + 3} y={b.y + 3} width={46} height={44} rx="4" fill="#e9edf3" />
              <rect x={b.x + 9} y={b.y + 6} width={34} height={11} rx="5" fill="#ffffff" />
              <rect x={b.x + 3} y={b.y + 24} width={46} height={23} rx="4" fill={['#5b7bd5', '#c2557a', '#4f9a7a', '#c98a3a'][i]} />
            </g>
          ))}
          <circle cx={x + w / 2} cy={y + 60} r="50" fill="url(#lamp)" opacity="0.6" />
        </g>
      );
  }
}

function Character({ member, selected, onSelect }: { member: OfficeMember; selected: boolean; onSelect: () => void }) {
  const { activity } = member;
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const lastPos = useRef(member.position);

  const left = (member.position.x / MAP_W) * 100;
  const top = (member.position.y / MAP_H) * 100;
  const pose = walking ? 'walk' : activity.pose;

  const bubble =
    activity.tone === 'off' ? null : activity.tone === 'idle' ? null : activity.tone === 'waiting' ? 'waiting' : activity.label.split(' ')[0]!.toLowerCase();

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
      className="group absolute flex -translate-x-1/2 -translate-y-full flex-col items-center transition-[left,top] duration-[1800ms] ease-in-out focus-visible:outline-none"
      style={{ left: `${left}%`, top: `${top}%`, zIndex: Math.round(member.position.y) }}
    >
      {bubble && (
        <span
          className={`mb-0.5 whitespace-nowrap rounded-full px-1.5 py-px font-mono text-[9px] leading-tight shadow ${
            activity.tone === 'waiting' ? 'bg-amber-400 text-black' : 'bg-indigo-500 text-white'
          }`}
        >
          {bubble}
        </span>
      )}
      {activity.tone === 'off' && (
        <span className="zzz pointer-events-none absolute -right-1 top-0 font-mono text-[10px] font-bold text-sky-200" aria-hidden>
          z
        </span>
      )}
      <span
        className={`relative rounded-full ${selected ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]' : 'group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]'}`}
        style={{ transform: walking && facingLeft ? 'scaleX(-1)' : undefined }}
      >
        {/* Sized in container units so characters grow and shrink with the map. */}
        <CharacterSprite look={lookOf(member.id)} pose={pose} size={30} className="!h-[clamp(42px,5.4cqw,84px)] !w-[clamp(28px,3.6cqw,56px)]" />
      </span>
      <span
        className="-mt-1 max-w-[clamp(64px,7cqw,110px)] truncate rounded px-1 font-mono text-[clamp(9px,0.95cqw,12px)] font-medium leading-tight text-white"
        style={{ background: `${member.color}cc` }}
      >
        {member.name}
      </span>
    </button>
  );
}

function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `#${((mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)).toString(16).padStart(6, '0')}`;
}
