'use client';

import type { TaskSummary } from '@smart-team/shared';
import Link from 'next/link';
import { useTask } from '@/hooks/useTask';
import { api } from '@/lib/api';
import { Terminal } from '../Terminal';

/** The office's side terminal: the live session of the task in focus, with the same input as the task page. */
export function OfficeTerminal({ task }: { task: TaskSummary | undefined }) {
  if (!task) {
    return (
      <section className="flex h-full min-h-80 flex-col overflow-hidden rounded-xl border border-black/40 bg-term-bg font-mono text-[13px] text-term-muted">
        <TerminalHeader title="Terminal · idle" />
        <div className="grid flex-1 place-items-center p-6 text-center">No task running for this team. Start one with “New task”.</div>
      </section>
    );
  }
  return <LiveTerminal taskId={task.id} />;
}

function LiveTerminal({ taskId }: { taskId: string }) {
  const { task } = useTask(taskId);
  if (!task) return <section className="h-full min-h-80 rounded-xl bg-term-bg" />;

  return (
    <div className="flex h-full min-h-80 flex-col">
      <Terminal
        title={`Terminal · open — ${task.deviceName}`}
        lines={task.lines}
        inputEnabled={task.canFollowUp}
        inputHint={task.canFollowUp ? 'Tell Claude what to do next…' : 'Claude is working…'}
        onSend={(text) => api.followUp(task.id, text)}
      />
      <Link href={`/tasks/${task.id}`} className="mt-1.5 self-end text-xs text-muted hover:text-foreground">
        Open full task →
      </Link>
    </div>
  );
}

function TerminalHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs">
      <span className="size-2 rounded-full bg-term-ok" aria-hidden />
      <span className="uppercase tracking-wider">{title}</span>
    </header>
  );
}
