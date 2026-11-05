'use client';

import { PLAN_AGENT_NAME, type TaskDetail } from '@smart-team/shared';
import Link from 'next/link';
import { useState } from 'react';
import { useTask } from '@/hooks/useTask';
import { api } from '@/lib/api';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Terminal } from './Terminal';

export function TaskView({ taskId }: { taskId: string }) {
  const { task, error } = useTask(taskId);

  if (error) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      </main>
    );
  }
  if (!task) return <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">Loading…</main>;

  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <Link href="/tasks" className="text-sm text-muted hover:text-foreground">
        ← Tasks
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
          <p className="mt-1 truncate text-sm text-muted">
            {task.deviceName} · <span className="font-mono">{task.workDir}</span>
            {task.costUsd !== null && <> · last run ${task.costUsd.toFixed(2)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={task.status} mode={task.mode} />
          <TaskActions task={task} />
        </div>
      </header>

      {task.status === 'AWAITING_APPROVAL' && (
        <p className="mt-4 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
          {PLAN_AGENT_NAME} has a plan ready. Read it in the terminal, then approve it, or type what to change to get a new plan.
        </p>
      )}

      {/* Fixed to the screen height so the terminal scrolls inside itself, like a real one. */}
      <div className="mt-4 flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col">
        <Terminal
          title={`${task.deviceName} — ${task.workDir}`}
          lines={task.lines}
          inputEnabled={task.canFollowUp}
          inputHint={inputHint(task)}
          onSend={(text) => api.followUp(task.id, text)}
        />
      </div>
    </main>
  );
}

function TaskActions({ task }: { task: TaskDetail }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = task.status === 'RUNNING' || task.status === 'QUEUED';

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

  return (
    <>
      {error && <span className="text-xs text-danger">{error}</span>}
      {task.canApprove && (
        <button
          disabled={busy}
          onClick={() => act(() => api.approve(task.id))}
          className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-60"
        >
          Approve plan
        </button>
      )}
      {running && (
        <button
          disabled={busy}
          onClick={() => {
            if (window.confirm('Stop this run? Work done so far stays on the PC.')) void act(() => api.cancel(task.id));
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-danger disabled:opacity-60"
        >
          Cancel
        </button>
      )}
    </>
  );
}

function inputHint(task: TaskDetail): string {
  if (task.status === 'AWAITING_APPROVAL') return 'Type what to change in the plan, or approve it above. Enter to send.';
  if (task.canFollowUp) return 'Tell Claude what to do next. Enter to send, Shift+Enter for a new line.';
  return task.mode === 'PLAN' ? `${PLAN_AGENT_NAME} is planning…` : 'Claude is working…';
}
