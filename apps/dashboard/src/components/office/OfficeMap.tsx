'use client';

import { useEffect, useRef, useState } from 'react';
import { lookOf } from '@/lib/characters';
import { MAP_H, MAP_W, type OfficeMember, type RoomId } from '@/lib/office';
import { speechFor } from '@/lib/speech';
import { OfficeBuilding } from './OfficeBuilding';
import { PixelSprite } from './PixelSprite';

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
    <div className="@container relative isolate w-full overflow-hidden rounded-xl border border-black/70 bg-[#0b0c10] shadow-2xl" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
      <OfficeBuilding counts={counts} />
      {members.map((m) => (
        <Character key={m.id} member={m} tick={tick} selected={m.id === selectedId} onSelect={() => onSelect(m.id)} />
      ))}
    </div>
  );
}

/** Small round icon over the head for people who are not talking: resting, idle or off duty. */
function statusIcon(member: OfficeMember, tick: number): string | null {
  if (member.activity.tone === 'off') return '💤';
  if (member.activity.tone !== 'idle') return null;
  const icons = ['☕', '🎧', '💬', '📖'];
  return icons[(tick + member.id.length) % icons.length]!;
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
  const icon = walking || speech ? null : statusIcon(member, tick);

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
          className={`bubble-in relative mb-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[clamp(9px,1cqw,13px)] font-medium leading-tight shadow-lg ${
            activity.tone === 'waiting' ? 'border-amber-300/60 bg-amber-950/95 text-amber-100' : 'border-violet-300/50 bg-[#24203f]/95 text-violet-100'
          }`}
        >
          {speech}
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-inherit bg-inherit" aria-hidden />
        </span>
      )}
      {icon && (
        <span
          className={`mb-1 grid size-[clamp(18px,2.2cqw,30px)] place-items-center rounded-full border border-white/15 bg-[#14161d]/90 text-[clamp(10px,1.2cqw,16px)] shadow ${
            activity.tone === 'off' ? 'zzz' : ''
          }`}
          aria-hidden
        >
          {icon}
        </span>
      )}

      {/* Hover card, like a game tooltip: name · role · status. */}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-black/20 bg-white px-2 py-0.5 text-[11px] text-black shadow-lg group-hover:block">
        {member.name.toLowerCase()} · {member.title} · {activity.label.toLowerCase()}
      </span>

      <span
        className={`relative ${selected ? 'drop-shadow-[0_0_6px_rgba(167,139,250,1)]' : 'group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]'}`}
        style={{ transform: walking && facingLeft ? 'scaleX(-1)' : undefined }}
      >
        {/* Sized in container units so characters grow and shrink with the map. */}
        <PixelSprite look={lookOf(member.id)} pose={pose} size={36} className="!h-[clamp(58px,7.4cqw,118px)] !w-[clamp(34px,4.3cqw,68px)]" />
      </span>
      <span className="-mt-0.5 max-w-[clamp(70px,8cqw,120px)] truncate px-1 text-[clamp(9px,1cqw,13px)] font-semibold leading-tight text-white [text-shadow:0_1px_2px_#000,0_0_4px_#000]">
        {member.name}
      </span>
    </button>
  );
}

/** A counter that goes up every `ms`, so speech bubbles and icons change now and then. */
function useTick(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}
