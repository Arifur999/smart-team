'use client';

import { TEAMS, totalTokens, type TeamId } from '@smart-team/shared';
import Link from 'next/link';
import { useAgentStats } from '@/hooks/useAgentStats';
import { useTasks } from '@/hooks/useTasks';
import { formatTokens, officeMembers } from '@/lib/office';
import { CharacterFigure } from '../office/CharacterFigure';
import { TaskStatusBadge } from '../TaskStatusBadge';

const TONE_DOT: Record<string, string> = { busy: 'bg-ok', waiting: 'bg-warn', idle: 'bg-idle', off: 'bg-line' };

/** Live facts about one team, straight from the hub: who is doing what, its tasks, and its tokens and cost. */
export function TeamInfo({ team, onAsk }: { team: TeamId; onAsk: (text: string) => void }) {
  const { tasks } = useTasks();
  const stats = useAgentStats();
  const info = TEAMS.find((t) => t.id === team)!;
  const members = officeMembers(team, tasks ?? []).filter((m) => m.teamId === team);
  const mine = (tasks ?? []).filter((t) => t.team === team);

  const tokens = members.reduce((sum, m) => sum + (stats[m.id] ? totalTokens(stats[m.id]!.usage) : 0), 0);
  const cost = members.reduce((sum, m) => sum + (stats[m.id]?.costUsd ?? 0), 0);
  const running = mine.filter((t) => t.status === 'RUNNING' || t.status === 'QUEUED').length;
  const waiting = mine.filter((t) => t.status === 'INTAKE' || t.status === 'AWAITING_APPROVAL').length;
  const done = mine.filter((t) => t.status === 'SUCCEEDED').length;

  return (
    <section className="border-b border-line bg-chip/40 px-3 py-2.5" aria-label={`${info.label} overview`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: info.color }} aria-hidden />
          {info.label} <span className="font-normal text-muted">· {info.focus}</span>
        </p>
        <button onClick={() => onAsk(`@${team} give me a full report: what is everyone doing, task progress, tokens and cost.`)} className="rounded-md border border-line px-2 py-0.5 text-xs text-muted hover:text-foreground">
          Ask for a report
        </button>
      </div>

      <dl className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px]">
        <Fact label="Working" value={String(running)} />
        <Fact label="Needs you" value={String(waiting)} />
        <Fact label="Done" value={String(done)} />
        <Fact label="Tokens" value={formatTokens(tokens)} />
        <Fact label="Cost" value={`$${cost.toFixed(2)}`} />
      </dl>

      <ul className="mt-2 space-y-1">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-xs">
            <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0c0e13]">
              <CharacterFigure id={m.id} bust size={22} />
            </span>
            <span className="w-24 shrink-0 truncate font-medium">{m.name}</span>
            <span className={`size-1.5 shrink-0 rounded-full ${TONE_DOT[m.activity.tone]}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-muted">{m.activity.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{stats[m.id] ? formatTokens(totalTokens(stats[m.id]!.usage)) : '0'}</span>
          </li>
        ))}
      </ul>

      {mine.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2">
          {mine.slice(0, 3).map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-xs">
              <TaskStatusBadge status={t.status} mode={t.mode} />
              <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate hover:underline">
                {t.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface px-1 py-1 ring-1 ring-line">
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
      <dt className="text-muted">{label}</dt>
    </div>
  );
}
