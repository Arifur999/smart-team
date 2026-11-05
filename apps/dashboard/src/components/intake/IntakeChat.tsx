'use client';

import { INTAKE_AGENT_NAME, type IntakeView } from '@smart-team/shared';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useIntake } from '@/hooks/useIntake';
import { api } from '@/lib/api';
import { CharacterFigure } from '../office/CharacterFigure';
import { AttachPanel } from './AttachPanel';
import { BriefChecklist } from './BriefChecklist';

const PHASE_NOTE: Record<IntakeView['phase'], string> = {
  ASKING: 'Answering questions',
  REVIEWING: `${INTAKE_AGENT_NAME} is checking the brief…`,
  CLARIFYING: `${INTAKE_AGENT_NAME} has follow-up questions`,
  READY: 'Ready for you to confirm',
  LOCKED: 'Brief confirmed',
};

/** The brief chat: the intake agent asks, you answer and attach files, then confirm the brief. */
export function IntakeChat({ taskId }: { taskId: string }) {
  const { intake, error, reload } = useIntake(taskId);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [intake?.messages.length]);

  if (error) return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>;
  if (!intake) return <p className="text-sm text-muted">Loading the brief…</p>;

  const field = intake.fields.find((f) => f.id === intake.currentFieldId) ?? null;
  const canType = intake.phase === 'ASKING' || intake.phase === 'CLARIFYING' || intake.phase === 'READY';

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const send = (text: string) =>
    act(async () => {
      await api.intakeAnswer(taskId, text);
      setDraft('');
    });

  const confirm = () => act(() => api.intakeConfirm(taskId));

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && draft.trim()) {
      event.preventDefault();
      void send(draft.trim());
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface" aria-label="Brief chat">
        <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-[#0c0e13]">
            <CharacterFigure id="friday" bust size={34} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{INTAKE_AGENT_NAME} · Intake agent</p>
            <p className="text-xs text-muted">{PHASE_NOTE[intake.phase]}</p>
          </div>
        </header>

        <div ref={log} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
          {intake.messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === 'YOU' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                  m.from === 'YOU' ? 'rounded-br-sm bg-accent text-white' : 'rounded-bl-sm bg-chip text-foreground'
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
          {intake.phase === 'REVIEWING' && (
            <p className="flex items-center gap-2 text-xs text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden /> {INTAKE_AGENT_NAME} is reading the brief…
            </p>
          )}
        </div>

        {field?.kind === 'files' && intake.phase === 'ASKING' && (
          <AttachPanel taskId={taskId} fieldId={field.id} fieldLabel={field.label} busy={busy} onDone={reload} onError={setActionError} />
        )}

        <footer className="border-t border-line p-3">
          {actionError && <p className="mb-2 text-xs text-danger">{actionError}</p>}
          <div className="flex items-end gap-2">
            <textarea
              aria-label={`Answer ${INTAKE_AGENT_NAME}`}
              rows={Math.min(5, Math.max(1, draft.split('\n').length))}
              value={draft}
              disabled={!canType || busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                !canType
                  ? intake.phase === 'LOCKED'
                    ? 'The brief is confirmed.'
                    : 'Wait a moment…'
                  : intake.phase === 'READY'
                    ? 'Anything to change? Or confirm the brief.'
                    : 'Type your answer. Enter to send, Shift+Enter for a new line.'
              }
              className="min-h-10 flex-1 resize-none rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
            />
            <button
              disabled={!canType || busy || !draft.trim()}
              onClick={() => send(draft.trim())}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
            >
              Send
            </button>
            {intake.phase === 'READY' && (
              <button onClick={confirm} disabled={busy} className="whitespace-nowrap rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                Confirm brief
              </button>
            )}
          </div>
          {intake.phase === 'ASKING' && field && (
            <div className="mt-2 flex gap-2 text-xs">
              {field.kind === 'files' && field.assets.length > 0 && (
                <QuickReply onClick={() => send('next')} disabled={busy}>
                  Next question
                </QuickReply>
              )}
              {!field.required && (
                <QuickReply onClick={() => send('skip')} disabled={busy}>
                  Skip this one
                </QuickReply>
              )}
            </div>
          )}
        </footer>
      </section>

      <BriefChecklist intake={intake} busy={busy} onConfirm={confirm} onRemove={(id) => act(() => api.removeAsset(taskId, id))} />
    </div>
  );
}

function QuickReply({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-full border border-line px-3 py-1 text-muted hover:text-foreground disabled:opacity-50">
      {children}
    </button>
  );
}
