'use client';

import { useMemo, useRef, useState } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { api } from '@/lib/api';

type Mode = 'upload' | 'path' | 'link';

interface Props {
  taskId: string;
  fieldId: string;
  fieldLabel: string;
  busy: boolean;
  onDone: () => void;
  onError: (message: string | null) => void;
}

const input = 'w-full rounded-lg border border-line bg-background px-3 py-1.5 text-sm outline-none focus:border-accent';

/** Three ways to give files for a brief question: upload, a folder on one of your PCs, or a link. */
export function AttachPanel({ taskId, fieldId, fieldLabel, busy, onDone, onError }: Props) {
  const [mode, setMode] = useState<Mode>('upload');
  const [uploading, setUploading] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [path, setPath] = useState('');
  const [url, setUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const { devices } = useDevices();
  const device = devices?.find((d) => d.id === deviceId);
  const folders = useMemo(() => device?.resources.filter((r) => r.kind === 'FOLDER' && r.path) ?? [], [device]);

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
      onDone();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of [...files]) {
      setUploading(file.name);
      await run(() => api.uploadAsset(taskId, fieldId, file));
    }
    setUploading(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  return (
    <div className="border-t border-line bg-background/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">Add files for {fieldLabel}</p>
        <div role="tablist" className="flex gap-1 text-xs">
          {(['upload', 'path', 'link'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md px-2 py-1 ${mode === m ? 'bg-chip font-medium' : 'text-muted hover:text-foreground'}`}
            >
              {m === 'upload' ? 'Upload' : m === 'path' ? 'Folder on a PC' : 'Link'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'upload' && (
        <div className="mt-2 flex items-center gap-2">
          <input ref={fileInput} type="file" multiple disabled={busy || !!uploading} onChange={(e) => upload(e.target.files)} className="text-sm" />
          {uploading && <span className="text-xs text-muted">Uploading {uploading}…</span>}
        </div>
      )}

      {mode === 'path' && (
        <form
          className="mt-2 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api.addPathAsset(taskId, { fieldId, deviceId, path: path.trim() })).then(() => setPath(''));
          }}
        >
          <select required className={input} value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">Which PC?</option>
            {devices?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            required
            list={`folders-${fieldId}`}
            className={`${input} font-mono`}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="D:\media\vfx-refs"
          />
          <datalist id={`folders-${fieldId}`}>
            {folders.map((f) => (
              <option key={f.path} value={f.path!}>
                {f.name}
              </option>
            ))}
          </datalist>
          <button disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50">
            Add
          </button>
          <p className="text-[11px] text-muted sm:col-span-3">It must be inside a folder that PC shares in its agent.config.json.</p>
        </form>
      )}

      {mode === 'link' && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api.addLinkAsset(taskId, { fieldId, url: url.trim() })).then(() => setUrl(''));
          }}
        >
          <input required type="url" className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <button disabled={busy} className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50">
            Add
          </button>
        </form>
      )}
    </div>
  );
}
