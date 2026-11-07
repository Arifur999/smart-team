'use client';

import { defaultLineKey, INTAKE_AGENT_NAME, lineByKey, memberById, PLAN_AGENT_NAME, TEAMS, type LineDirection, type TaskSummary, type TeamId } from '@smart-team/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { api } from '@/lib/api';

const field = 'w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent';

interface Props {
  onClose: () => void;
  defaultTeam?: TeamId;
  /** Called with the new task instead of opening its page. */
  onCreated?: (task: TaskSummary) => void;
}

export function NewTaskForm({ onClose, defaultTeam, onCreated }: Props) {
  const router = useRouter();
  const { devices } = useDevices();
  const [team, setTeam] = useState<TeamId | ''>(defaultTeam ?? '');
  const [deviceId, setDeviceId] = useState('');
  const [workDir, setWorkDir] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<LineDirection>('match');
  const [trust, setTrust] = useState(false);
  const [passMark, setPassMark] = useState(80);
  const [maxFixes, setMaxFixes] = useState(3);

  const device = devices?.find((d) => d.id === deviceId);
  const folders = useMemo(() => device?.resources.filter((r) => r.kind === 'FOLDER' && r.path) ?? [], [device]);
  const line = team ? lineByKey(defaultLineKey(team)) : undefined;
  const reader = line?.stages.find((s) => s.key === 'source');
  const readerName = reader ? (memberById(reader.owner)?.name ?? reader.owner) : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!team) throw new Error('Choose a team.');
      const task = await api.createTask({
        team,
        title: title.trim(),
        prompt: prompt.trim(),
        deviceId,
        workDir,
        ...(line ? { lineSettings: { direction, trust, passMark, maxFixes } } : {}),
      });
      if (onCreated) onCreated(task);
      else router.push(`/tasks/${task.id}`);
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
            {line
              ? `${INTAKE_AGENT_NAME} asks for anything else the team needs. Then the team works stage by stage on the Production Line, each member on their own stage, and you approve the plan and the finished result.`
              : `${INTAKE_AGENT_NAME} asks for anything else the team needs, then ${PLAN_AGENT_NAME} plans it in read-only mode. Nothing on the PC changes until you approve the plan.`}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-foreground">
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Team</span>
          <select required className={field} value={team} onChange={(e) => setTeam(e.target.value as TeamId)}>
            <option value="">Choose a team</option>
            {TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} · {t.focus}
              </option>
            ))}
          </select>
        </label>

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

        {line && (
          <fieldset className="grid gap-3 rounded-lg border border-line p-4 text-sm sm:col-span-2">
            <legend className="px-1 font-medium">How the team works</legend>
            {readerName && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Choice
                  name="direction"
                  checked={direction === 'match'}
                  onChange={() => setDirection('match')}
                  title="Match my reference"
                  text={`${readerName} reads your reference from start to finish and the team copies its style, pacing and cuts.`}
                />
                <Choice
                  name="direction"
                  checked={direction === 'concept'}
                  onChange={() => setDirection('concept')}
                  title="Make something new"
                  text="The team keeps the reference's mood and quality but designs its own idea, layout and transitions."
                />
              </div>
            )}
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={trust} onChange={(e) => setTrust(e.target.checked)} />
              <span>
                <span className="font-medium">Trust the team: skip my Ready check</span>
                <span className="block text-muted">The plan goes straight to work. You still approve the result in the Review Booth.</span>
              </span>
            </label>
            <details>
              <summary className="cursor-pointer text-muted hover:text-foreground">Quality bar</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span>Pass mark (out of 100)</span>
                  <input type="number" min={50} max={100} className={field} value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} />
                </label>
                <label className="grid gap-1.5">
                  <span>Fix rounds before it comes to you</span>
                  <input type="number" min={0} max={5} className={field} value={maxFixes} onChange={(e) => setMaxFixes(Number(e.target.value))} />
                </label>
              </div>
            </details>
          </fieldset>
        )}
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
          {saving ? 'Creating…' : 'Create and start the brief'}
        </button>
      </div>
    </form>
  );
}

function Choice({ name, checked, onChange, title, text }: { name: string; checked: boolean; onChange: () => void; title: string; text: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${checked ? 'border-accent bg-accent-soft/40' : 'border-line'}`}>
      <input type="radio" name={name} className="mt-1" checked={checked} onChange={onChange} />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-muted">{text}</span>
      </span>
    </label>
  );
}
