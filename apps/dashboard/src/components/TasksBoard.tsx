'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { NewTaskForm } from './NewTaskForm';
import { TaskStatusBadge } from './TaskStatusBadge';

export function TasksBoard() {
  const { tasks, error } = useTasks();
  const [creating, setCreating] = useState(false);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted">Every task is planned first, then carried out once you approve.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
            New task
          </button>
        )}
      </header>

      {creating && (
        <div className="mt-6">
          <NewTaskForm onClose={() => setCreating(false)} />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Could not load tasks: {error}
        </p>
      )}

      {tasks && tasks.length === 0 && !creating && (
        <section className="mt-8 rounded-xl border border-dashed border-line p-8 text-center">
          <h2 className="font-medium">No tasks yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Create one, pick a PC and a folder, and watch it work in the terminal.</p>
        </section>
      )}

      {tasks && tasks.length > 0 && (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link href={`/tasks/${task.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-chip">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{task.title}</div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {task.deviceName} · <span className="font-mono">{task.workDir}</span>
                  </div>
                </div>
                <TaskStatusBadge status={task.status} mode={task.mode} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
