'use client';

import { PLAN_AGENT_NAME } from '@smart-team/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { api } from '@/lib/api';

const field = 'w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent';

export function NewTaskForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { devices } = useDevices();
  const [deviceId, setDeviceId] = useState('');
  const [workDir, setWorkDir] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const device = devices?.find((d) => d.id === deviceId);
  const folders = useMemo(() => device?.resources.filter((r) => r.kind === 'FOLDER' && r.path) ?? [], [device]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const task = await api.createTask({ title: title.trim(), prompt: prompt.trim(), deviceId, workDir });
      router.push(`/tasks/${task.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">New task</h2>
          <p className="mt-1 text-sm text-muted">
            {PLAN_AGENT_NAME} plans it first in read-only mode. Nothing on the PC changes until you approve the plan.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-foreground">
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">PC</span>
          <select
            required
            className={field}
            value={deviceId}
            onChange={(e) => {
              setDeviceId(e.target.value);
              setWorkDir('');
            }}
          >
            <option value="">Choose a PC</option>
            {devices?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.status === 'ONLINE' ? '' : '(offline, will wait)'}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Working folder</span>
          <select required className={field} value={workDir} onChange={(e) => setWorkDir(e.target.value)} disabled={!device}>
            <option value="">{device ? (folders.length ? 'Choose a shared folder' : 'This PC shares no folders') : 'Choose a PC first'}</option>
            {folders.map((f) => (
              <option key={f.path} value={f.path}>
                {f.name} · {f.path}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Title</span>
          <input required maxLength={200} className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a login page" />
        </label>

        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">What should be done</span>
          <textarea
            required
            rows={5}
            maxLength={20_000}
            className={`${field} font-mono`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the goal, what done looks like, and anything that must not change."
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create and plan'}
        </button>
      </div>
    </form>
  );
}
