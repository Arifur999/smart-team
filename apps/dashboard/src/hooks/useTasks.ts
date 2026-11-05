'use client';

import { DashboardEvents, type TaskSummary } from '@smart-team/shared';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

/** All tasks, newest first, kept current by the hub's task:updated events. */
export function useTasks() {
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = hubSocket();
    const onUpdated = (task: TaskSummary) =>
      setTasks((current) => (current ? upsertNewestFirst(current, task) : current));
    // Listen first, then load, so an update that lands during the load is not lost.
    socket.on(DashboardEvents.taskUpdated, onUpdated);
    api
      .tasks()
      .then((list) => setTasks((current) => (current ? mergeLists(list, current) : list)))
      .catch((e: Error) => setError(e.message));
    return () => {
      socket.off(DashboardEvents.taskUpdated, onUpdated);
    };
  }, []);

  return { tasks, error };
}

function upsertNewestFirst(list: TaskSummary[], task: TaskSummary): TaskSummary[] {
  const rest = list.filter((t) => t.id !== task.id);
  return [task, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mergeLists(loaded: TaskSummary[], live: TaskSummary[]): TaskSummary[] {
  return live.reduce(upsertNewestFirst, loaded);
}
