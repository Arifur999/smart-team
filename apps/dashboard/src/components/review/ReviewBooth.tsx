'use client';

import { lineByKey, mainGate, memberById, stageOf, type DeliverableView, type FixNote, type TaskDetail, type VersionView, type VersionsView } from '@smart-team/shared';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSyncedVideos, type SyncedVideos } from '@/hooks/useSyncedVideos';
import { useTask } from '@/hooks/useTask';
import { useVersions } from '@/hooks/useVersions';
import { api, hubFile } from '@/lib/api';
import { formatTimecode, parseAt } from '@/lib/timecode';

type Compare = 'reference' | 'previous';

/**
 * The screening room for one task: its latest render next to the reference (or the version before),
 * playing in step, with the critic's notes, every version's score and your decision.
 */
export function ReviewBooth({ taskId }: { taskId: string }) {
  const { task, error } = useTask(taskId);
  const { versions, error: versionsError } = useVersions(taskId);
  const [picked, setPicked] = useState<number | null>(null);
  const [compare, setCompare] = useState<Compare>('reference');

  const isVideoLine = !task?.line || task.line.key === 'nextEditor.video';
  // Video lines show versions that have a render; other lines (design screens, campaign copy) every version with files.
  const list = versions?.versions.filter((v) => (isVideoLine ? masterOf(v) : v.files.length > 0)) ?? [];
  const current = list.find((v) => v.n === picked) ?? list.at(-1) ?? null;
  const previous = current ? list.filter((v) => v.n < current.n).at(-1) ?? null : null;
  const reference = versions?.references.find((d) => d.kind === 'VIDEO') ?? null;
  const output = current ? masterOf(current) : null;
  const other = compare === 'previous' && previous ? masterOf(previous) : reference;
  const sync = useSyncedVideos(25, output?.url);

  useKeys(sync, list, setPicked);

  if (error || versionsError) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Could not load this task: {error ?? versionsError}
        </p>
      </main>
    );
  }
  if (!task || !versions) return <main id="main" className="flex-1" aria-busy="true" />;

  const line = task.line ? lineByKey(task.line.key) : undefined;
  const atReview = task.line?.stage === 'review' && task.lineActions.includes('approve');

  return (
    <main id="main" className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href="/review" className="text-xs text-muted hover:text-foreground">
            ← Review Booth
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{task.title}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {isVideoLine ? (task.line?.settings.direction === 'concept' ? 'New concept' : 'Match the reference') : (lineByKey(task.line?.key)?.label ?? 'Work')} · pass mark {task.line?.passMark ?? 80}
            {task.line?.stageLabel ? ` · now at ${task.line.stageLabel}` : ''}
          </p>
        </div>
        <Link href={`/tasks/${task.id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-chip">
          Open task
        </Link>
      </header>

      {task.line?.state === 'done' && <p className="mt-4 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">Approved. This is the finished version.</p>}

      {!atReview && task.line && task.line.state !== 'done' && (
        <p className="mt-4 rounded-lg bg-chip px-3 py-2 text-sm text-muted">
          This is at {task.line.stageLabel ?? 'an earlier stage'} now. You can watch what is ready; your decision opens once Final QA passes.
        </p>
      )}

      {list.length === 0 ? (
        <section className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          Nothing to review yet. Versions show up here as the team finishes them.
        </section>
      ) : !isVideoLine ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
            <VersionFiles version={current} />
            {versions.references.length > 0 && <Strip title="References" files={versions.references.filter((f) => f.kind === 'IMAGE')} />}
          </div>
          <aside className="space-y-4">
            <VersionList list={list} current={current} onPick={setPicked} line={line} />
            {current && <CriticNotes version={current} onSeek={() => {}} />}
            {atReview && current && <Decision task={task} version={current.n} time={0} />}
          </aside>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
            <Players sync={sync} output={output} outputLabel={current ? `v${current.n}` : ''} other={other} otherLabel={compare === 'previous' && previous ? `v${previous.n}` : 'Reference'} />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Compare with</span>
              <Toggle on={compare === 'reference'} onClick={() => setCompare('reference')} disabled={!reference}>
                Reference
              </Toggle>
              <Toggle on={compare === 'previous'} onClick={() => setCompare('previous')} disabled={!previous}>
                {previous ? `v${previous.n}` : 'Previous version'}
              </Toggle>
              <span className="ml-auto text-xs text-muted">Space play · ← → 1 s · , . one frame · 1–9 version</span>
            </div>
            <Extras version={current} versions={versions} />
            <Frames versions={versions} />
          </div>

          <aside className="space-y-4">
            <VersionList list={list} current={current} onPick={setPicked} line={line} />
            {current && <CriticNotes version={current} onSeek={sync.seek} />}
            {atReview && current && <Decision task={task} version={current.n} time={sync.time} />}
          </aside>
        </div>
      )}
    </main>
  );
}

/** A version's files for lines without video: images large, documents as links to open. */
function VersionFiles({ version }: { version: VersionView | null }) {
  if (!version) return null;
  // The newest upload of each path.
  const latest = [...new Map([...version.files].sort((a, b) => a.version - b.version).map((f) => [f.path, f])).values()];
  const images = latest.filter((f) => f.kind === 'IMAGE');
  const docs = latest.filter((f) => f.kind !== 'IMAGE');
  return (
    <section aria-label={`Version ${version.n}`} className="space-y-4">
      {docs.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {docs.map((f) => (
            <li key={f.id}>
              <a href={hubFile(f.url)} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-line bg-surface px-3 py-2 hover:bg-chip">
                {f.label ?? f.path.split('/').pop()} <span className="ml-2 text-muted">{f.path.split('/').pop()}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {images.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((f) => (
            <li key={f.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              <a href={hubFile(f.url)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- served by the hub, sizes unknown */}
                <img src={hubFile(f.url)} alt={f.path.split('/').pop() ?? ''} loading="lazy" className="max-h-[70vh] w-full object-contain object-top" />
              </a>
              <p className="border-t border-line px-3 py-1.5 text-xs text-muted">{f.path}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The render a version is judged by: its film.mp4 (the newest upload of it), else its first video. */
function masterOf(v: VersionView): DeliverableView | null {
  const videos = v.files.filter((f) => f.kind === 'VIDEO');
  const films = videos.filter((f) => /(^|\/)film\.mp4$/i.test(f.path)).sort((a, b) => b.version - a.version);
  return films[0] ?? videos[0] ?? null;
}

function Players({ sync, output, outputLabel, other, otherLabel }: { sync: SyncedVideos; output: DeliverableView | null; outputLabel: string; other: DeliverableView | null; otherLabel: string }) {
  const [soundFrom, setSoundFrom] = useState<'output' | 'other'>('output');
  return (
    <section aria-label="Players" className="overflow-hidden rounded-xl border border-prod-edge bg-prod-bg text-prod-fg">
      <div className={`grid gap-px bg-prod-edge ${other ? 'md:grid-cols-2' : ''}`}>
        <Player label={`Output ${outputLabel}`} file={output} videoRef={sync.lead} muted={soundFrom !== 'output'} onClick={sync.toggle} />
        {other && <Player label={otherLabel} file={other} videoRef={sync.follow} muted={soundFrom !== 'other'} onClick={sync.toggle} />}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-prod-edge px-3 py-2">
        <button onClick={sync.toggle} className="rounded-md bg-prod-glow px-3 py-1 text-sm font-semibold text-[#1a1033]" aria-label={sync.playing ? 'Pause both' : 'Play both'}>
          {sync.playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => sync.step(-1)} className="rounded-md px-2 py-1 text-sm text-prod-muted hover:text-prod-fg" aria-label="Back one frame">
          ‹ frame
        </button>
        <button onClick={() => sync.step(1)} className="rounded-md px-2 py-1 text-sm text-prod-muted hover:text-prod-fg" aria-label="Forward one frame">
          frame ›
        </button>
        <input
          type="range"
          min={0}
          max={sync.duration || 0}
          step={0.04}
          value={Math.min(sync.time, sync.duration || 0)}
          onChange={(e) => sync.seek(Number(e.target.value))}
          className="min-w-32 flex-1 accent-[var(--prod-glow)]"
          aria-label="Position"
        />
        <span className="font-mono text-xs tabular-nums text-prod-muted">
          {formatTimecode(sync.time)} / {formatTimecode(sync.duration)}
        </span>
        {other && (
          <label className="flex items-center gap-1.5 text-xs text-prod-muted">
            Sound
            <select value={soundFrom} onChange={(e) => setSoundFrom(e.target.value as 'output' | 'other')} className="rounded bg-prod-lane px-1.5 py-0.5 text-prod-fg">
              <option value="output">Output</option>
              <option value="other">{otherLabel}</option>
            </select>
          </label>
        )}
      </div>
    </section>
  );
}

function Player({ label, file, videoRef, muted, onClick }: { label: string; file: DeliverableView | null; videoRef: React.RefObject<HTMLVideoElement | null>; muted: boolean; onClick: () => void }) {
  return (
    <figure className="relative bg-black">
      {file ? (
        <video
          key={file.url}
          ref={videoRef}
          src={hubFile(file.url)}
          preload="auto"
          playsInline
          muted={muted}
          onClick={onClick}
          className="aspect-video max-h-[62vh] w-full cursor-pointer object-contain"
        />
      ) : (
        <div className="grid aspect-video place-items-center text-sm text-prod-muted">No video</div>
      )}
      <figcaption className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-medium">{label}</figcaption>
    </figure>
  );
}

function VersionList({ list, current, onPick, line }: { list: VersionView[]; current: VersionView | null; onPick: (n: number) => void; line: ReturnType<typeof lineByKey> }) {
  const gate = line ? mainGate(line)?.key : undefined;
  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-label="Versions">
      <h2 className="text-sm font-semibold">Versions</h2>
      <ul className="mt-2 space-y-1">
        {list.map((v) => {
          const verdict = v.verdicts.filter((x) => x.stage === gate).at(-1) ?? v.verdicts.at(-1);
          const on = v.n === current?.n;
          return (
            <li key={v.n}>
              <button
                onClick={() => onPick(v.n)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${on ? 'bg-accent-soft' : 'hover:bg-chip'}`}
              >
                <span className="font-semibold">v{v.n}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{verdict?.summary ?? 'Not judged yet'}</span>
                {verdict?.score !== null && verdict?.score !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${verdict.pass ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{verdict.score}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const SEVERITY: Record<string, string> = { P0: 'bg-danger-soft text-danger', P1: 'bg-warn-soft text-warn', P2: 'bg-chip text-muted' };

function CriticNotes({ version, onSeek }: { version: VersionView; onSeek: (s: number) => void }) {
  if (version.verdicts.length === 0) {
    return <section className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">No critic notes for v{version.n} yet.</section>;
  }
  return (
    <section className="space-y-3" aria-label="Critic notes">
      {version.verdicts.map((v, i) => {
        const who = memberById(v.ownerId)?.name ?? v.ownerId;
        return (
          <article key={`${v.stage}-${v.round}-${i}`} className="rounded-xl border border-line bg-surface p-4">
            <header className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {who} <span className="font-normal text-muted">· {v.stage}</span>
              </h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.pass ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>
                {v.pass ? 'Pass' : 'Fail'}
                {v.score !== null ? ` · ${v.score}` : ''}
              </span>
            </header>
            {v.summary && <p className="mt-2 text-sm">{v.summary}</p>}
            {v.fixes.length > 0 && (
              <ol className="mt-3 space-y-2">
                {v.fixes.map((f) => (
                  <FixItem key={f.id} fix={f} onSeek={onSeek} />
                ))}
              </ol>
            )}
          </article>
        );
      })}
    </section>
  );
}

function FixItem({ fix, onSeek }: { fix: FixNote; onSeek: (s: number) => void }) {
  const at = parseAt(fix.at);
  return (
    <li className="rounded-lg border border-line p-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded px-1.5 font-semibold ${SEVERITY[fix.severity] ?? SEVERITY.P2}`}>{fix.severity}</span>
        <span className="text-muted">{fix.stage}</span>
        {at !== null && (
          <button onClick={() => onSeek(at)} className="rounded bg-accent-soft px-1.5 font-mono text-accent hover:underline" aria-label={`Show ${fix.at} in both players`}>
            {fix.at}
          </button>
        )}
        {fix.scene && <span className="text-muted">· {fix.scene}</span>}
      </div>
      <p className="mt-1">{fix.problem}</p>
      <p className="mt-0.5 text-muted">→ {fix.fix}</p>
    </li>
  );
}

/** Other videos of this version (extra formats) and its sound, as links. */
function Extras({ version, versions }: { version: VersionView | null; versions: VersionsView }) {
  if (!version) return null;
  const master = masterOf(version);
  // Older uploads of the master's own path (before Sound replaced it) are not extra formats.
  const files = version.files.filter((f) => f.path !== master?.path && (f.kind === 'VIDEO' || f.kind === 'AUDIO'));
  const sheet = versions.references.find((d) => d.kind === 'IMAGE' && /reference-sheet/i.test(d.path));
  if (files.length === 0 && !sheet) return null;
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {files.map((f) => (
        <li key={f.id}>
          <a href={hubFile(f.url)} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-1.5 hover:bg-chip">
            {f.path.split('/').pop()}
          </a>
        </li>
      ))}
      {sheet && (
        <li>
          <a href={hubFile(sheet.url)} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-1.5 hover:bg-chip">
            Reference contact sheet
          </a>
        </li>
      )}
    </ul>
  );
}

/** Style frames from the newest storyboard round and the reference's beat frames. */
function Frames({ versions }: { versions: VersionsView }) {
  const round = versions.styleFrames[0]?.path.match(/\/v(\d+)\//)?.[1];
  const stills = versions.styleFrames.filter((f) => f.kind === 'IMAGE' && (!round || f.path.includes(`/v${round}/`))).slice(0, 24);
  const refs = versions.references.filter((d) => d.kind === 'IMAGE' && /reference-frames\//i.test(d.path)).slice(0, 24);
  if (stills.length === 0 && refs.length === 0) return null;
  return (
    <section aria-label="Frames" className="space-y-3">
      {stills.length > 0 && <Strip title={`Style frames${round ? ` · round ${round}` : ''}`} files={stills} />}
      {refs.length > 0 && <Strip title="Reference frames" files={refs} />}
    </section>
  );
}

function Strip({ title, files }: { title: string; files: DeliverableView[] }) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h2>
      <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {files.map((f) => (
          <li key={f.id} className="shrink-0">
            <a href={hubFile(f.url)} target="_blank" rel="noreferrer" title={f.path}>
              {/* eslint-disable-next-line @next/next/no-img-element -- served by the hub, sizes unknown */}
              <img src={hubFile(f.url)} alt={f.path.split('/').pop() ?? ''} loading="lazy" className="h-24 w-auto max-w-none rounded-md border border-line bg-black object-contain" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Decision({ task, version, time }: { task: TaskDetail; version: number; time: number }) {
  const line = lineByKey(task.line!.key)!;
  const targets = mainGate(line)?.gate?.fixTargets ?? [];
  const [mode, setMode] = useState<'idle' | 'confirm' | 'send'>('idle');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ at: string; text: string }[]>([]);
  const [stage, setStage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setMode('idle');
      setNotes('');
      setItems([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filled = items.filter((i) => i.text.trim());
  const canSend = notes.trim().length > 0 || filled.length > 0;
  const send = () =>
    run(() =>
      api.lineSendBack(task.id, {
        notes: notes.trim() || filled.map((i) => `[${i.at}] ${i.text.trim()}`).join('\n'),
        items: filled.map((i) => ({ at: i.at, text: i.text.trim() })),
        ...(stage ? { stage } : {}),
      }),
    );

  return (
    <section className="rounded-xl border border-warn/40 bg-surface p-4" aria-label="Your decision">
      <h2 className="text-sm font-semibold">Your decision</h2>
      {mode === 'idle' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setMode('confirm')} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
            Approve v{version}
          </button>
          <button onClick={() => setMode('send')} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-chip">
            Send back
          </button>
        </div>
      )}

      {mode === 'confirm' && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">Approve v{version} as the finished work? The task is marked done.</p>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => run(() => api.lineApprove(task.id, `Approved v${version}`))} className="rounded-lg bg-ok px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {busy ? 'Approving…' : 'Yes, approve'}
            </button>
            <button onClick={() => setMode('idle')} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'send' && (
        <form
          className="mt-3 space-y-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) void send();
          }}
        >
          <label className="grid gap-1.5">
            <span className="font-medium">What should change</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={8000} className="rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-accent" placeholder="Be as exact as you can: what you see, and what you want instead." />
          </label>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="shrink-0 rounded bg-accent-soft px-1.5 font-mono text-xs text-accent">{item.at}</span>
                <input
                  value={item.text}
                  onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  maxLength={1000}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-background px-2 py-1 outline-none focus:border-accent"
                  placeholder="What is wrong here"
                  aria-label={`Note at ${item.at}`}
                />
                <button type="button" onClick={() => setItems((all) => all.filter((_, j) => j !== i))} className="text-xs text-muted hover:text-danger" aria-label={`Remove note at ${item.at}`}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setItems((all) => [...all, { at: formatTimecode(time), text: '' }].slice(0, 30))} className="rounded-lg border border-dashed border-line px-3 py-1 text-xs hover:bg-chip">
              + Note at {formatTimecode(time)}
            </button>
          </div>
          <label className="grid gap-1.5">
            <span className="font-medium">Send to</span>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className="rounded-lg border border-line bg-background px-3 py-2">
              <option value="">Let the critic route each note</option>
              {targets.map((key) => (
                <option key={key} value={key}>
                  {stageOf(line, key)?.label ?? key} and everything after it
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !canSend} className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50">
              {busy ? 'Sending…' : 'Send back'}
            </button>
            <button type="button" onClick={() => setMode('idle')} className="rounded-lg px-3 py-2 text-muted hover:text-foreground">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function Toggle({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={on} className={`rounded-full border px-3 py-1 text-xs disabled:opacity-40 ${on ? 'border-foreground bg-foreground text-background' : 'border-line text-muted hover:text-foreground'}`}>
      {children}
    </button>
  );
}

/** Space, arrows, comma/period and 1–9 drive the players; typing in a field never does. No key approves. */
function useKeys(sync: SyncedVideos, list: VersionView[], pick: (n: number) => void) {
  const numbers = useMemo(() => list.map((v) => v.n), [list]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') sync.toggle();
      else if (e.key === 'ArrowLeft') sync.seek(sync.time - 1);
      else if (e.key === 'ArrowRight') sync.seek(sync.time + 1);
      else if (e.key === ',') sync.step(-1);
      else if (e.key === '.') sync.step(1);
      else if (/^[1-9]$/.test(e.key) && numbers[Number(e.key) - 1] !== undefined) pick(numbers[Number(e.key) - 1]!);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sync, numbers, pick]);
}
