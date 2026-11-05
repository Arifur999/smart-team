'use client';

import { initials, MAP_H, MAP_W, ROOMS, type OfficeMember, type Room } from '@/lib/office';

// The office is always drawn at night, in both themes, like the terminal.
const C = {
  floor: '#1b1f2a',
  floorAlt: '#1f2431',
  wall: '#3a4152',
  wallLit: '#556079',
  label: '#9aa4b8',
  desk: '#4a3b2e',
  deskTop: '#5c4a39',
  screen: '#0f1724',
  screenGlow: '#3b82f6',
  chair: '#2b3140',
  sofa: '#3a3346',
  plant: '#2f6b47',
  rack: '#262c38',
  led: '#22c55e',
};

interface Props {
  members: OfficeMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function OfficeMap({ members, selectedId, onSelect }: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-black/40 bg-[#11141b]" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 size-full" role="img" aria-label="Office map">
        <defs>
          <pattern id="tiles" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={C.floor} />
            <rect width="10" height="10" fill={C.floorAlt} />
            <rect x="10" y="10" width="10" height="10" fill={C.floorAlt} />
          </pattern>
        </defs>
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

function RoomShape({ room }: { room: Room }) {
  const { x, y, w, h } = room;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill="url(#tiles)" stroke={C.wall} strokeWidth="4" />
      <text x={x + 12} y={y + 20} fill={C.label} fontSize="12" fontFamily="ui-monospace, monospace" letterSpacing="1">
        {room.label.toUpperCase()}
      </text>
      <Furniture room={room} />
    </g>
  );
}

function Furniture({ room }: { room: Room }) {
  const { x, y, w } = room;
  switch (room.id) {
    case 'briefing':
      return (
        <g>
          <rect x={x + 90} y={y + 34} width={120} height={46} rx="3" fill="#e5e7eb" opacity="0.85" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={x + 60 + (i % 4) * 50} y={y + 100 + Math.floor(i / 4) * 30} width={24} height={18} rx="4" fill={C.chair} />
          ))}
        </g>
      );
    case 'command':
      return (
        <g>
          <rect x={x + 40} y={y + 32} width={w - 80} height={56} rx="3" fill={C.screen} stroke={C.screenGlow} strokeOpacity="0.5" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={x + 55 + i * 62} y={y + 44} width={48} height={32} rx="2" fill={C.screenGlow} opacity={0.15 + i * 0.08} />
          ))}
          <rect x={x + 50} y={y + 110} width={w - 100} height={26} rx="4" fill={C.desk} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={x + 62 + i * 46} y={y + 113} width={30} height={10} rx="1" fill={C.screenGlow} opacity="0.45" />
          ))}
        </g>
      );
    case 'approval':
      return (
        <g>
          <rect x={x + 80} y={y + 60} width={120} height={50} rx="4" fill={C.desk} />
          <rect x={x + 120} y={y + 66} width={40} height={14} rx="2" fill={C.screen} stroke={C.screenGlow} strokeOpacity="0.6" />
          <rect x={x + 125} y={y + 118} width={30} height={20} rx="5" fill={C.chair} />
          <circle cx={x + 240} cy={y + 50} r="12" fill={C.plant} />
        </g>
      );
    case 'workspace':
      return (
        <g>
          {room.slots.map((slot, i) => (
            <g key={i}>
              <rect x={slot.x - 45} y={slot.y - 62} width={90} height={34} rx="3" fill={C.desk} />
              <rect x={slot.x - 30} y={slot.y - 58} width={26} height={16} rx="1" fill={C.screen} stroke={C.screenGlow} strokeOpacity="0.5" />
              <rect x={slot.x + 4} y={slot.y - 58} width={26} height={16} rx="1" fill={C.screen} stroke={C.screenGlow} strokeOpacity="0.5" />
            </g>
          ))}
        </g>
      );
    case 'review':
      return (
        <g>
          <ellipse cx={x + w / 2} cy={y + 110} rx="60" ry="36" fill={C.desk} />
          <rect x={x + w / 2 - 22} y={y + 96} width={44} height={22} rx="2" fill={C.screen} stroke={C.screenGlow} strokeOpacity="0.5" />
        </g>
      );
    case 'server':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={x + 25 + i * 52} y={y + 40} width={38} height={110} rx="3" fill={C.rack} stroke={C.wall} />
              {[0, 1, 2, 3, 4, 5].map((j) => (
                <circle key={j} cx={x + 34 + i * 52} cy={y + 52 + j * 16} r="2" fill={C.led} opacity={(i + j) % 3 === 0 ? 0.9 : 0.35} />
              ))}
            </g>
          ))}
        </g>
      );
    case 'meeting':
      return (
        <g>
          <rect x={x + 50} y={y + 40} width={w - 100} height={44} rx="8" fill={C.desk} />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={x + 66 + i * 40} y={y + 30} width={20} height={8} rx="3" fill={C.chair} />
          ))}
        </g>
      );
    case 'lounge':
      return (
        <g>
          <rect x={x + 24} y={y + 34} width={120} height={30} rx="10" fill={C.sofa} />
          <rect x={x + 60} y={y + 76} width={50} height={26} rx="4" fill={C.desk} />
          <rect x={x + w - 150} y={y + 34} width={120} height={30} rx="10" fill={C.sofa} />
          <circle cx={x + w - 22} cy={y + 110} r="12" fill={C.plant} />
          <circle cx={x + 180} cy={y + 30} r="10" fill={C.plant} />
        </g>
      );
  }
}

function Character({ member, selected, onSelect }: { member: OfficeMember; selected: boolean; onSelect: () => void }) {
  const { activity } = member;
  const left = (member.position.x / MAP_W) * 100;
  const top = (member.position.y / MAP_H) * 100;
  // "Planning", "Supervising", "Working on PC-2" → planning, supervising, working.
  const bubble = activity.tone === 'idle' ? null : activity.tone === 'waiting' ? 'waiting' : activity.label.split(' ')[0]!.toLowerCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${member.name}, ${member.title}: ${activity.label}`}
      aria-pressed={selected}
      className="group absolute flex -translate-x-1/2 -translate-y-full flex-col items-center transition-[left,top] duration-[1400ms] ease-in-out focus-visible:outline-none"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      {bubble && (
        <span
          className={`mb-1 rounded-full px-1.5 py-px font-mono text-[9px] leading-tight ${
            activity.tone === 'waiting' ? 'bg-amber-400/90 text-black' : 'bg-indigo-500/90 text-white'
          }`}
        >
          {bubble}
        </span>
      )}
      <span
        className={`grid size-7 place-items-center rounded-full border-2 text-[10px] font-bold text-white shadow-md sm:size-8 ${
          activity.tone === 'busy' ? 'animate-[bob_1.6s_ease-in-out_infinite]' : ''
        } ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#11141b]' : 'group-hover:ring-2 group-hover:ring-white/50'}`}
        style={{ background: member.color, borderColor: 'rgba(255,255,255,0.35)' }}
      >
        {initials(member.name)}
      </span>
      <span className="mt-0.5 max-w-20 truncate rounded bg-black/55 px-1 font-mono text-[9px] leading-tight text-white/90">
        {member.name.split(' ')[0]}
      </span>
    </button>
  );
}
