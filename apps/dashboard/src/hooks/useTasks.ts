'use client';

import { DashboardEvents, type TaskSummary } from '@smart-team/shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

/** All tasks, newest first, kept current by the hub's task:updated events. */
export function useTasks() {
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Loads the list from the hub. The fresh list wins over what the page had: it may have missed updates. */
  const reload = useCallback(() => {
    api
      .tasks()
      .then((list) => {
        setTasks(list);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const socket = hubSocket();
    const onUpdated = (task: TaskSummary) =>
      setTasks((current) => (current ? upsertNewestFirst(current, task) : current));
    // Listen first, then load, so an update that lands during the first load is not lost.
    socket.on(DashboardEvents.taskUpdated, onUpdated);
    api
      .tasks()
      .then((list) => setTasks((current) => (current ? mergeLists(list, current) : list)))
      .catch((e: Error) => setError(e.message));
    // After a lost connection (a hub restart, Wi-Fi), updates sent meanwhile never arrived: load again.
    let connectedBefore = socket.connected;
    const onConnect = () => {
      if (connectedBefore) reload();
      connectedBefore = true;
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off(DashboardEvents.taskUpdated, onUpdated);
      socket.off('connect', onConnect);
    };
  }, [reload]);

  return { tasks, error, reload };
}

function upsertNewestFirst(list: TaskSummary[], task: TaskSummary): TaskSummary[] {
  const rest = list.filter((t) => t.id !== task.id);
  return [task, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mergeLists(loaded: TaskSummary[], live: TaskSummary[]): TaskSummary[] {
  return live.reduce(upsertNewestFirst, loaded);
}
