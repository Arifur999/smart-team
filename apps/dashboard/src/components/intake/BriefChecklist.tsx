import type { AssetView, IntakeView } from '@smart-team/shared';

interface Props {
  intake: IntakeView;
  busy: boolean;
  onConfirm: () => void;
  onRemove: (assetId: string) => void;
}

/** Everything the brief has so far, field by field, and the summary to confirm once it is checked. */
export function BriefChecklist({ intake, busy, onConfirm, onRemove }: Props) {
  const required = intake.fields.filter((f) => f.required);
  const done = required.filter((f) => f.answer || f.assets.length > 0).length;

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto" aria-label="Brief">
      <section className="rounded-xl border border-line bg-surface p-4">
        <header className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Brief</h2>
          <span className="text-xs text-muted">
            {done} of {required.length} required
          </span>
        </header>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-chip">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${required.length ? (done / required.length) * 100 : 100}%` }} />
        </div>

        <ul className="mt-3 space-y-2.5">
          {intake.fields.map((f) => {
            const answered = Boolean(f.answer) || f.assets.length > 0;
            const current = f.id === intake.currentFieldId;
            return (
              <li key={f.id} className={`text-sm ${current ? 'rounded-lg bg-accent-soft/60 p-2 -m-2' : ''}`}>
                <div className="flex items-center gap-2">
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${
                      answered ? 'bg-ok text-white' : f.skipped ? 'bg-idle-soft text-muted' : 'border border-line'
                    }`}
                    aria-hidden
                  >
                    {answered ? '✓' : f.skipped ? '–' : ''}
                  </span>
                  <span className="font-medium">{f.label}</span>
                  {f.required && !answered && <span className="text-[10px] uppercase text-warn">required</span>}
                  {f.skipped && <span className="text-[10px] uppercase text-muted">skipped</span>}
                </div>
                {f.answer && <p className="ml-6 mt-0.5 line-clamp-2 text-xs text-muted">{f.answer}</p>}
                {f.assets.length > 0 && (
                  <ul className="ml-6 mt-1 space-y-0.5">
                    {f.assets.map((a) => (
                      <AssetRow key={a.id} asset={a} locked={intake.phase === 'LOCKED'} onRemove={() => onRemove(a.id)} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {intake.summary && (
        <section className="flex min-h-0 flex-col rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Summary for the team</h2>
          <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-chip p-3 font-sans text-xs leading-relaxed">{intake.summary}</pre>
          {intake.phase === 'READY' && (
            <button
              onClick={onConfirm}
              disabled={busy}
              className="mt-3 rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Confirm brief and start planning
            </button>
          )}
        </section>
      )}
    </aside>
  );
}

function AssetRow({ asset, locked, onRemove }: { asset: AssetView; locked: boolean; onRemove: () => void }) {
  const where =
    asset.kind === 'UPLOAD' ? `uploaded${asset.size ? ` · ${formatBytes(asset.size)}` : ''}` : asset.kind === 'PATH' ? `on ${asset.deviceName ?? 'a PC'}` : 'link';
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="min-w-0 flex-1 truncate font-mono" title={asset.path ?? asset.url ?? asset.name}>
        {asset.name}
      </span>
      <span className="shrink-0 text-muted">{where}</span>
      {!locked && (
        <button onClick={onRemove} className="shrink-0 text-muted hover:text-danger" aria-label={`Remove ${asset.name}`}>
          ✕
        </button>
      )}
    </li>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
