'use client';

import { PLAN_AGENT_NAME, type TaskSummary } from '@smart-team/shared';
import { useState } from 'react';
import { api } from '@/lib/api';

/** Plans waiting for your decision, with the oldest one up front: Apply starts the work, Dismiss cancels it. */
export function NeedsYou({ waiting, onOpen }: { waiting: TaskSummary[]; onOpen: (task: TaskSummary) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const task = waiting[0];

  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!task) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
        <span className="size-2 rounded-full bg-ok" aria-hidden />
        Nothing needs you
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-sm">
      <span className="flex items-center gap-2 font-medium text-warn">
        <span className="size-2 animate-pulse rounded-full bg-warn" aria-hidden />
        Needs you · {waiting.length}
      </span>
      <button onClick={() => onOpen(task)} className="min-w-0 max-w-72 truncate text-left text-foreground hover:underline" title={task.title}>
        {PLAN_AGENT_NAME}’s plan: {task.title}
      </button>
      <span className="ml-auto flex gap-2">
        {error && <span className="text-xs text-danger">{error}</span>}
        <button
          disabled={busy}
          onClick={() => act(() => api.approve(task.id))}
          className="rounded-md bg-ok px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
        >
          Apply
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Dismiss the plan for “${task.title}”? Nothing on the PC has changed yet.`)) void act(() => api.cancel(task.id));
          }}
          className="rounded-md border border-danger/50 px-3 py-1 text-xs font-semibold text-danger disabled:opacity-60"
        >
          Dismiss
        </button>
      </span>
    </div>
  );
}
