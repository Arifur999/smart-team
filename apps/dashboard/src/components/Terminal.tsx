'use client';

import type { TerminalLine } from '@smart-team/shared';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

const KIND_STYLE: Record<TerminalLine['kind'], string> = {
  prompt: 'text-term-accent font-semibold',
  text: 'text-term-fg',
  tool: 'text-term-warn',
  tool_result: 'text-term-muted',
  status: 'text-term-muted italic',
  error: 'text-term-danger',
  result: 'text-term-ok',
};

const PREFIX: Record<TerminalLine['kind'], string> = {
  prompt: '❯ ',
  text: '',
  tool: '● ',
  tool_result: '  ⎿ ',
  status: '· ',
  error: '✗ ',
  result: '✓ ',
};

/** Tool output is often long; show its first lines and let the reader expand it. */
const COLLAPSE_AFTER = 6;

interface Props {
  lines: TerminalLine[];
  /** Shown above the transcript, like a terminal's title bar. */
  title: string;
  inputEnabled: boolean;
  inputHint: string;
  onSend: (text: string) => Promise<void>;
}

export function Terminal({ lines, title, inputEnabled, inputHint, onSend }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (stickToBottom && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [lines, stickToBottom]);

  async function send() {
    const text = draft.trim();
    if (!text || !inputEnabled || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await onSend(text);
      setDraft('');
      setStickToBottom(true);
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/40 bg-term-bg font-mono text-[13px] leading-relaxed text-term-fg">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-term-muted">
        <span className="size-2.5 rounded-full bg-term-danger/70" aria-hidden />
        <span className="size-2.5 rounded-full bg-term-warn/70" aria-hidden />
        <span className="size-2.5 rounded-full bg-term-ok/70" aria-hidden />
        <span className="ml-2 truncate">{title}</span>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setStickToBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
      >
        {lines.length === 0 && <p className="text-term-muted">Waiting for the PC to start…</p>}
        {lines.map((line) => (
          <TerminalRow key={`${line.runId}:${line.seq}`} line={line} />
        ))}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className={inputEnabled ? 'text-term-accent' : 'text-term-muted'} aria-hidden>
            ❯
          </span>
          <textarea
            aria-label="Message to Claude"
            rows={Math.min(6, Math.max(1, draft.split('\n').length))}
            value={draft}
            disabled={!inputEnabled || sending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={inputHint}
            className="flex-1 resize-none bg-transparent text-term-fg outline-none placeholder:text-term-muted disabled:cursor-not-allowed"
          />
        </div>
        {sendError && <p className="mt-2 text-xs text-term-danger">{sendError}</p>}
      </div>
    </section>
  );
}

function TerminalRow({ line }: { line: TerminalLine }) {
  const [expanded, setExpanded] = useState(false);
  const rows = line.text.split('\n');
  const collapsible = line.kind === 'tool_result' && rows.length > COLLAPSE_AFTER;
  const shown = collapsible && !expanded ? rows.slice(0, COLLAPSE_AFTER).join('\n') : line.text;

  // The prefix sits in its own column so wrapped and multi-line text stays indented under it.
  return (
    <div className={`flex ${KIND_STYLE[line.kind]} ${line.kind === 'prompt' ? 'mt-3 first:mt-0' : ''}`}>
      <span className="shrink-0 whitespace-pre" aria-hidden>
        {PREFIX[line.kind]}
      </span>
      <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">
        {shown}
        {collapsible && (
          <button onClick={() => setExpanded(!expanded)} className="ml-2 text-term-accent underline-offset-2 hover:underline">
            {expanded ? 'show less' : `+${rows.length - COLLAPSE_AFTER} more lines`}
          </button>
        )}
      </div>
    </div>
  );
}
