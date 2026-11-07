'use client';

import type { RuleBookView, RuleProposalView } from '@smart-team/shared';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** How often to look for new proposals (Nick Fury writes them a few seconds after you send work back). */
const POLL_MS = 15_000;

/**
 * House rules: what you told the teams once and they now follow every time. Nick Fury turns your send-back
 * notes into proposed rules; you apply or dismiss them here.
 */
export function HouseRules() {
  const [books, setBooks] = useState<RuleBookView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .rules()
      .then((b) => {
        setBooks(b);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const act = async (id: string, action: (id: string) => Promise<unknown>) => {
    setBusy(id);
    try {
      await action(id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const proposals = books?.flatMap((b) => b.proposals.map((p) => ({ ...p, label: b.label }))) ?? [];
  const total = books?.reduce((n, b) => n + b.active.length, 0) ?? 0;

  return (
    <section className="mt-10" aria-labelledby="rules-heading">
      <h2 id="rules-heading" className="text-sm font-semibold">
        House rules {proposals.length > 0 && <span className="ml-1 rounded-full bg-warn-soft px-1.5 text-xs text-warn">{proposals.length} new</span>}
      </h2>
      <p className="mt-1 text-sm text-muted">
        When you send work back, Nick Fury turns your notes into rules every member follows from then on, so you never say the same thing twice.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {proposals.length > 0 && (
        <ul className="mt-4 space-y-3">
          {proposals.map((p) => (
            <Proposal key={p.id} p={p} busy={busy === p.id} onApply={() => act(p.id, api.applyRule)} onDismiss={() => act(p.id, api.dismissRule)} />
          ))}
        </ul>
      )}

      {books && (
        <details className="mt-4 rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm">
            {total} active rule{total === 1 ? '' : 's'} across the teams
          </summary>
          <div className="space-y-4 border-t border-line px-4 py-3">
            {books
              .filter((b) => b.active.length > 0)
              .map((b) => (
                <div key={b.scope}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{b.label}</h3>
                  <ul className="mt-1.5 space-y-1.5 text-sm">
                    {b.active.map((r) => (
                      <li key={r.id}>
                        <span className="font-mono text-xs text-muted">{r.id}</span> <span className="font-medium">{r.title}</span>
                        <span className="block text-muted">{r.rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </details>
      )}
    </section>
  );
}

function Proposal({ p, busy, onApply, onDismiss }: { p: RuleProposalView & { label: string }; busy: boolean; onApply: () => void; onDismiss: () => void }) {
  return (
    <li className="rounded-xl border border-warn/40 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            Proposed for {p.label}
            {p.taskId && (
              <>
                {' · from '}
                <Link href={`/tasks/${p.taskId}`} className="hover:underline">
                  your notes
                </Link>
              </>
            )}
          </p>
          <h3 className="mt-0.5 font-medium">{p.title}</h3>
        </div>
        <div className="flex shrink-0 gap-2">
          <button disabled={busy} onClick={onApply} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-60">
            Apply
          </button>
          <button disabled={busy} onClick={onDismiss} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-chip disabled:opacity-60">
            Dismiss
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm">{p.rule}</p>
      <p className="mt-1 text-xs text-muted">
        Why: {p.why}
        {p.check ? ` · Check: ${p.check}` : ''} · Stages: {p.applies}
      </p>
    </li>
  );
}
