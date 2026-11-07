'use client';

import { totalTokens, type AgentStats } from '@smart-team/shared';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTask } from '@/hooks/useTask';
import { formatDuration, formatTokens, ROOMS, type OfficeMember } from '@/lib/office';
import { TaskStatusBadge } from '../TaskStatusBadge';
import { CharacterFigure } from './CharacterFigure';

const KIND_STYLE: Record<string, string> = {
  prompt: 'text-term-accent',
  text: 'text-term-fg',
  tool: 'text-term-warn',
  tool_result: 'text-term-muted',
  status: 'text-term-muted italic',
  error: 'text-term-danger',
  result: 'text-term-ok',
};

const ROLE_TEXT: Record<string, string> = {
  manager: 'Splits work across teams and reviews each team’s output. Starts in phase 7.',
  planner: 'Plans every task in read-only plan mode before anything changes.',
  'final-qa': 'Checks the finished work against the brief before it reaches you. Starts in phase 8.',
  intake: 'Collects briefs, files and references from you. Starts in phase 4.',
  'command-bot': 'Chat and voice control for the whole office. Starts in phase 9.',
  leader: 'Owns the team’s quality: splits work, reviews it and sends revisions.',
  worker: 'Does the hands-on work with the team’s skills.',
  reference: 'Pulls style, pacing and details out of your references.',
  qa: 'Checks the team’s work with real tests and checklists.',
};

interface Props {
  member: OfficeMember;
  stats?: AgentStats;
  /** The member's skills from the hub; a null version means the hub could not find that skill. */
  skills?: { name: string; version: string | null }[];
  onClose: () => void;
}

export function MemberDetail({ member, stats, skills = [], onClose }: Props) {
  const room = ROOMS.find((r) => r.id === member.activity.room);
  const now = useNow(1_000);
  const runningFor = stats?.currentRunStartedAt && now ? (now - new Date(stats.currentRunStartedAt).getTime()) / 1000 : null;
  // activeSeconds was measured when the stats were loaded; keep the live run ticking between refreshes.
  const usage = stats?.usage ?? { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface" aria-label={`${member.name} details`}>
      <div className="relative flex items-end gap-4 px-4 pb-3 pt-4" style={{ background: `linear-gradient(135deg, ${member.color}55, transparent 70%)` }}>
        <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#0c0e13] shadow-inner ring-1 ring-white/10">
          {/* The renders have empty space around the figure; size up and let the box trim it. */}
          <CharacterFigure id={member.id} pose={member.activity.pose} size={84} className="!h-[136px] !w-[109px]" />
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <h2 className="truncate text-lg font-semibold">{member.name}</h2>
          <p className="text-sm text-muted">{member.title}</p>
          <p className="mt-0.5 text-xs text-muted">{member.teamLabel}</p>
        </div>
        <button onClick={onClose} className="absolute right-3 top-3 text-sm text-muted hover:text-foreground" aria-label="Close details">
          ✕
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <p className="text-xs text-muted">{ROLE_TEXT[member.role]}</p>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Now" value={member.activity.label} wide />
          <Stat label="Where" value={room?.label ?? '—'} />
          <Stat label="Working for" value={runningFor !== null ? formatDuration(runningFor) : 'Not working'} />
          <Stat label="Total time worked" value={stats ? formatDuration(stats.activeSeconds) : '0s'} />
          <Stat label="Runs" value={String(stats?.runs ?? 0)} />
          <Stat label="Tokens used" value={formatTokens(totalTokens(usage))} />
          <Stat label="Cost" value={`$${(stats?.costUsd ?? 0).toFixed(2)}`} />
        </dl>

        {totalTokens(usage) > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] text-muted">
            <TokenPart label="Input" value={usage.input} />
            <TokenPart label="Output" value={usage.output} />
            <TokenPart label="Cache read" value={usage.cacheRead} />
            <TokenPart label="Cache write" value={usage.cacheCreation} />
          </div>
        )}

        <SkillList skills={skills} />

        {member.activity.detail && (
          <p className="mt-3 truncate text-sm">
            <span className="text-muted">Task: </span>
            {member.activity.detail}
          </p>
        )}

        {member.activity.taskId ? (
          <LiveTail taskId={member.activity.taskId} />
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-line p-4 text-sm text-muted">Nothing assigned right now.</p>
        )}
      </div>
    </aside>
  );
}

/** The skills this member's runs load, with the exact version the hub has. */
function SkillList({ skills }: { skills: { name: string; version: string | null }[] }) {
  const missing = skills.filter((s) => !s.version).length;
  return (
    <section className="mt-3" aria-label="Skills">
      <h3 className="flex items-baseline justify-between text-[11px] font-medium uppercase tracking-wide text-muted">
        Skills
        {skills.length > 0 && (
          <span className="normal-case tracking-normal">
            {skills.length - missing} loaded{missing > 0 ? ` · ${missing} missing on the hub` : ''}
          </span>
        )}
      </h3>
      {skills.length === 0 ? (
        <p className="mt-1 text-xs text-muted">No skills for this role yet.</p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {skills.map((s) => (
            <li
              key={s.name}
              title={s.version ? `${s.name} · version ${s.version}` : `${s.name} is not on the hub PC yet`}
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${
                s.version ? 'border-line bg-chip text-foreground' : 'border-danger/40 bg-danger-soft text-danger line-through'
              }`}
            >
              {s.name}
              {s.version && <span className="ml-1 text-muted">{s.version.slice(0, 6)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-chip px-3 py-2 ${wide ? 'col-span-2' : ''}`}>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="truncate font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function TokenPart({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line px-1 py-1">
      <div className="font-medium tabular-nums text-foreground">{formatTokens(value)}</div>
      {label}
    </div>
  );
}

/** The last lines of the member's current task, live, with a link to the full terminal. */
function LiveTail({ taskId }: { taskId: string }) {
  const { task } = useTask(taskId);
  const box = useRef<HTMLDivElement>(null);
  const tail = task?.lines.slice(-30) ?? [];

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [tail.length]);

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        {task && <TaskStatusBadge status={task.status} mode={task.mode} line={task.line} />}
        <Link href={`/tasks/${taskId}`} className="text-sm font-medium text-accent hover:underline">
          Open terminal →
        </Link>
      </div>
      <div ref={box} className="mt-2 min-h-40 flex-1 overflow-y-auto rounded-lg bg-term-bg p-3 font-mono text-[11px] leading-relaxed" role="log" aria-live="polite">
        {tail.length === 0 && <p className="text-term-muted">Waiting for output…</p>}
        {tail.map((line) => (
          <p key={`${line.runId}:${line.seq}`} className={`line-clamp-3 whitespace-pre-wrap break-words ${KIND_STYLE[line.kind]}`}>
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Ticks every `ms`. Starts at null because reading the clock during render breaks Next's prerender. */
function useNow(ms: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
