'use client';

import { DashboardEvents, LEADERSHIP, TEAMS, runAgentId, type TaskSummary, type TeamId } from '@smart-team/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { hubSocket } from '@/lib/socket';

export interface ChatLine {
  id: string;
  at: string;
  memberId: string;
  name: string;
  text: string;
}

const MAX_LINES = 60;

/**
 * A team chat built from task events: each status change becomes a line from the member it concerns.
 * History comes from the current task list; changes after the page opened are added live.
 */
export function useTeamChat(teamId: TeamId, tasks: TaskSummary[] | null) {
  const [live, setLive] = useState<ChatLine[]>([]);
  const lastStatus = useRef(new Map<string, string>());

  useEffect(() => {
    const socket = hubSocket();
    const onUpdated = (task: TaskSummary) => {
      const key = `${task.status}:${task.mode}`;
      if (lastStatus.current.get(task.id) === key) return;
      lastStatus.current.set(task.id, key);
      const line = chatLine(task, new Date().toISOString());
      if (line) setLive((current) => [...current, line].slice(-MAX_LINES));
    };
    socket.on(DashboardEvents.taskUpdated, onUpdated);
    return () => {
      socket.off(DashboardEvents.taskUpdated, onUpdated);
    };
  }, []);

  return useMemo(() => {
    const history = (tasks ?? [])
      .map((t) => chatLine(t, t.finishedAt ?? t.startedAt ?? t.createdAt))
      .filter((l): l is ChatLine => l !== null);
    const team = TEAMS.find((t) => t.id === teamId);
    const memberIds = new Set([...LEADERSHIP, ...(team?.members ?? [])].map((m) => m.id));
    const seen = new Set<string>();
    return [...history, ...live]
      .filter((l) => memberIds.has(l.memberId) && l.id.startsWith(`${teamId}:`))
      .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-MAX_LINES);
  }, [tasks, live, teamId]);
}

function chatLine(task: TaskSummary, at: string): ChatLine | null {
  const team = TEAMS.find((t) => t.id === task.team);
  if (!team) return null;
  const leader = team.members.find((m) => m.role === 'leader')!;
  const worker = team.members.find((m) => m.id === runAgentId(task.team, 'EXECUTE'))!;
  const planner = LEADERSHIP.find((m) => m.role === 'planner')!;
  const title = `“${task.title}”`;

  const byStatus: Record<string, [typeof planner, string]> = {
    'QUEUED:PLAN': [planner, `Picked up ${title}. Waiting for ${task.deviceName}.`],
    'RUNNING:PLAN': [planner, `Planning ${title} on ${task.deviceName}.`],
    'AWAITING_APPROVAL:PLAN': [planner, `Plan for ${title} is ready. Your call.`],
    'QUEUED:EXECUTE': [worker, `Next up: ${title}.`],
    'RUNNING:EXECUTE': [worker, `On it: ${title}.`],
    'SUCCEEDED:EXECUTE': [worker, `Done with ${title}.`],
    'FAILED:PLAN': [planner, `Could not finish the plan for ${title}.`],
    'FAILED:EXECUTE': [worker, `Hit a problem on ${title}. Check the terminal.`],
    'CANCELLED:PLAN': [leader, `Stopped planning ${title}.`],
    'CANCELLED:EXECUTE': [leader, `Stopped work on ${title}.`],
  };
  const entry = byStatus[`${task.status}:${task.mode}`];
  if (!entry) return null;
  const [member, text] = entry;
  return { id: `${task.team}:${task.id}:${task.status}:${task.mode}`, at, memberId: member.id, name: member.name, text };
}
