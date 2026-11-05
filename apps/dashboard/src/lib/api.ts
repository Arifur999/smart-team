import type { AgentStats, CreateTaskInput, RoleSkills, TaskDetail, TaskSummary } from '@smart-team/shared';
import { hubUrl } from './hub';

/** The hub's error message when it sent one, so forms can show it as is. */
export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(`/api${path}`, hubUrl()), {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message || `The hub answered ${res.status}.`);
  }
  return res.status === 202 || res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  tasks: () => request<TaskSummary[]>('/tasks'),
  task: (id: string) => request<TaskDetail>(`/tasks/${id}`),
  createTask: (input: CreateTaskInput) => request<TaskSummary>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  approve: (id: string) => request<void>(`/tasks/${id}/approve`, { method: 'POST' }),
  followUp: (id: string, prompt: string) => request<void>(`/tasks/${id}/messages`, { method: 'POST', body: JSON.stringify({ prompt }) }),
  cancel: (id: string) => request<void>(`/tasks/${id}/cancel`, { method: 'POST' }),
  agentStats: () => request<AgentStats[]>('/agents/stats'),
  skillRoles: () => request<RoleSkills[]>('/skills/roles'),
};
