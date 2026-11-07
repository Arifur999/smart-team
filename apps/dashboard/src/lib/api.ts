import type {
  AddLinkAssetInput,
  AddPathAssetInput,
  AgentStats,
  AssetView,
  BotMessageView,
  BotSendInput,
  BotStatus,
  CreateTaskInput,
  IntakeView,
  LineSettings,
  LineView,
  RoleSkills,
  SendBackInput,
  TaskDetail,
  TaskSummary,
  VersionsView,
} from '@smart-team/shared';
import { hubUrl } from './hub';

/** A hub path (e.g. a deliverable's url) as a full URL the browser can load. */
export const hubFile = (path: string) => new URL(path, hubUrl()).toString();

/** The hub's error message when it sent one, so forms can show it as is. */
export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData sets its own multipart content type; everything else is JSON.
  const json = !(init?.body instanceof FormData);
  const res = await fetch(new URL(`/api${path}`, hubUrl()), {
    ...init,
    headers: { ...(json ? { 'content-type': 'application/json' } : {}), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message || `The hub answered ${res.status}.`);
  }
  return res.status === 202 || res.status === 204 ? (undefined as T) : res.json();
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const api = {
  tasks: () => request<TaskSummary[]>('/tasks'),
  task: (id: string) => request<TaskDetail>(`/tasks/${id}`),
  createTask: (input: CreateTaskInput) => request<TaskSummary>('/tasks', post(input)),
  approve: (id: string) => request<void>(`/tasks/${id}/approve`, post()),
  followUp: (id: string, prompt: string) => request<void>(`/tasks/${id}/messages`, post({ prompt })),
  cancel: (id: string) => request<void>(`/tasks/${id}/cancel`, post()),
  agentStats: () => request<AgentStats[]>('/agents/stats'),
  skillRoles: () => request<RoleSkills[]>('/skills/roles'),

  intake: (id: string) => request<IntakeView>(`/tasks/${id}/intake`),
  intakeAnswer: (id: string, text: string) => request<void>(`/tasks/${id}/intake/messages`, post({ text })),
  intakeConfirm: (id: string) => request<void>(`/tasks/${id}/intake/confirm`, post()),
  uploadAsset: (id: string, fieldId: string, file: File) => {
    const form = new FormData();
    form.append('fieldId', fieldId);
    form.append('file', file);
    return request<AssetView>(`/tasks/${id}/intake/assets/upload`, { method: 'POST', body: form });
  },
  addPathAsset: (id: string, input: AddPathAssetInput) => request<AssetView>(`/tasks/${id}/intake/assets/path`, post(input)),
  addLinkAsset: (id: string, input: AddLinkAssetInput) => request<AssetView>(`/tasks/${id}/intake/assets/link`, post(input)),
  removeAsset: (id: string, assetId: string) => request<void>(`/tasks/${id}/intake/assets/${assetId}`, { method: 'DELETE' }),

  lines: () => request<LineView[]>('/lines'),
  versions: (id: string) => request<VersionsView>(`/tasks/${id}/versions`),
  lineApprove: (id: string, comment?: string) => request<void>(`/tasks/${id}/line/approve`, post({ comment })),
  lineSendBack: (id: string, input: SendBackInput) => request<void>(`/tasks/${id}/line/send-back`, post(input)),
  lineRetry: (id: string, instruction?: string) => request<void>(`/tasks/${id}/line/retry`, post({ instruction })),
  lineSkip: (id: string) => request<void>(`/tasks/${id}/line/skip`, post()),
  lineSettings: (id: string, patch: Partial<LineSettings>) => request<void>(`/tasks/${id}/line/settings`, { method: 'PATCH', body: JSON.stringify(patch) }),

  botStatus: () => request<BotStatus>('/bot/status'),
  botMessages: () => request<BotMessageView[]>('/bot/messages'),
  botSend: (input: BotSendInput) => request<BotMessageView>('/bot/messages', post(input)),
  botAnswer: (messageId: string, actionId: string, confirm: boolean) =>
    request<BotMessageView>(`/bot/messages/${messageId}/actions/${actionId}`, post({ confirm })),
};
