'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTask } from '@/hooks/useTask';
import { initials, ROOMS, type OfficeMember } from '@/lib/office';
import { TaskStatusBadge } from '../TaskStatusBadge';

const KIND_STYLE: Record<string, string> = {
  prompt: 'text-term-accent',
  text: 'text-term-fg',
  tool: 'text-term-warn',
  tool_result: 'text-term-muted',
  status: 'text-term-muted italic',
  error: 'text-term-danger',
  result: 'text-term-ok',
};

export function MemberDetail({ member, onClose }: { member: OfficeMember; onClose: () => void }) {
  const room = ROOMS.find((r) => r.id === member.activity.room);
  return (
    <aside className="flex h-full flex-col rounded-xl border border-line bg-surface p-4" aria-label={`${member.name} details`}>
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: member.color }} aria-hidden>
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{member.name}</h2>
          <p className="text-xs text-muted">
            {member.title} · {member.teamLabel}
          </p>
        </div>
        <button onClick={onClose} className="text-sm text-muted hover:text-foreground" aria-label="Close details">
          ✕
        </button>
      </header>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">Now</dt>
        <dd>{member.activity.label}</dd>
        <dt className="text-muted">Where</dt>
        <dd>{room?.label}</dd>
        {member.activity.detail && (
          <>
            <dt className="text-muted">Task</dt>
            <dd className="truncate">{member.activity.detail}</dd>
          </>
        )}
      </dl>

      {member.activity.taskId ? (
        <LiveTail taskId={member.activity.taskId} />
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-line p-4 text-sm text-muted">Nothing assigned right now.</p>
      )}
    </aside>
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
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        {task && <TaskStatusBadge status={task.status} mode={task.mode} />}
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
