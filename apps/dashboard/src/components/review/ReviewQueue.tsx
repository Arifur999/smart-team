'use client';

import type { TaskSummary } from '@smart-team/shared';
import Link from 'next/link';
import { useTasks } from '@/hooks/useTasks';
import { shortDuration, useNow } from '@/hooks/useNow';
import { HouseRules } from './HouseRules';

/** Work that reached your final review, and what you decided lately. */
export function ReviewQueue() {
  const { tasks, error } = useTasks();
  const now = useNow(30_000);
  const onLine = tasks?.filter((t) => t.line) ?? [];
  const waiting = onLine.filter((t) => t.line!.stage === 'review' && t.line!.state === 'waiting');
  const lately = onLine.filter((t) => t.line!.state === 'done' || t.line!.state === 'cancelled').slice(0, 12);
  const coming = onLine.filter((t) => t.line!.stage !== 'review' && !['done', 'cancelled'].includes(t.line!.state));

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Review Booth</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Look at the finished work next to its reference, read what the critic found, then approve it or send it back with notes.
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Could not load tasks: {error}
        </p>
      )}

      <section className="mt-8" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="text-sm font-semibold">
          Waiting for you {waiting.length > 0 && <span className="ml-1 rounded-full bg-warn-soft px-1.5 text-xs text-warn">{waiting.length}</span>}
        </h2>
        {tasks && waiting.length === 0 && (
          <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Nothing to review. {coming.length > 0 ? `${coming.length} on the line now; they come here once Final QA passes.` : ''}
          </p>
        )}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {waiting.map((t) => (
            <li key={t.id}>
              <ReviewCard task={t} now={now} />
            </li>
          ))}
        </ul>
      </section>

      {lately.length > 0 && (
        <section className="mt-10" aria-labelledby="lately-heading">
          <h2 id="lately-heading" className="text-sm font-semibold">
            Lately
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {lately.map((t) => (
              <li key={t.id}>
                <Link href={`/review/${t.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-chip">
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                  {t.line!.score !== null && <span className="text-sm tabular-nums text-muted">{t.line!.score}/100</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${t.line!.state === 'done' ? 'bg-ok-soft text-ok' : 'bg-chip text-muted'}`}>
                    {t.line!.state === 'done' ? 'Approved' : 'Cancelled'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HouseRules />
    </main>
  );
}

function ReviewCard({ task, now }: { task: TaskSummary; now: number | null }) {
  const l = task.line!;
  const since = l.since ? Date.parse(l.since) : null;
  const pass = l.score !== null && l.score >= l.passMark;
  return (
    <Link href={`/review/${task.id}`} className="block rounded-xl border border-line bg-surface p-4 hover:border-muted">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate font-medium">{task.title}</h3>
        {l.score !== null && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${pass ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{l.score}/100</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        Round {l.round} · {l.fixesUsed} fix round{l.fixesUsed === 1 ? '' : 's'} · {l.settings.direction === 'concept' ? 'new concept' : 'match the reference'}
      </p>
      <p className="mt-3 text-xs text-warn">{since && now ? `Waiting ${shortDuration((now - since) / 1000)}` : 'Waiting for you'}</p>
    </Link>
  );
}
