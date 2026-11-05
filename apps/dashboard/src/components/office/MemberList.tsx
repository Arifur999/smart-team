import type { AgentStats } from '@smart-team/shared';
import { totalTokens } from '@smart-team/shared';
import { lookOf } from '@/lib/characters';
import { formatTokens, type OfficeMember, type Tone } from '@/lib/office';
import { CharacterSprite } from './CharacterSprite';

const TONE_DOT: Record<Tone, string> = { busy: 'bg-accent', waiting: 'bg-warn', idle: 'bg-idle', off: 'bg-idle/50' };

interface Props {
  members: OfficeMember[];
  stats: Record<string, AgentStats>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MemberList({ members, stats, selectedId, onSelect }: Props) {
  const groups = [...new Set(members.map((m) => m.teamLabel))];
  return (
    <nav aria-label="Team members" className="space-y-4">
      {groups.map((group) => (
        <section key={group}>
          <h2 className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted">{group}</h2>
          <ul className="mt-1 space-y-0.5">
            {members
              .filter((m) => m.teamLabel === group)
              .map((m) => {
                const tokens = stats[m.id] ? totalTokens(stats[m.id]!.usage) : 0;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => onSelect(m.id)}
                      aria-current={m.id === selectedId ? 'true' : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${m.id === selectedId ? 'bg-chip' : 'hover:bg-chip/60'}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full ring-2" style={{ background: '#0c0e13', ['--tw-ring-color' as string]: m.color }}>
                        <CharacterSprite look={lookOf(m.id)} bust size={30} pose="stand" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{m.name}</span>
                          <span className="shrink-0 text-[11px] text-muted">{m.title}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <span className={`size-1.5 shrink-0 rounded-full ${TONE_DOT[m.activity.tone]}`} aria-hidden />
                          <span className="truncate">{m.activity.label}</span>
                          {tokens > 0 && <span className="ml-auto shrink-0 tabular-nums">{formatTokens(tokens)} tok</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
