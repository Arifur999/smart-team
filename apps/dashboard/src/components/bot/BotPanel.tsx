'use client';

import { BOT_NAME, TEAMS, type BotAction, type BotMessageView, type TeamId } from '@smart-team/shared';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useBot } from '@/hooks/useBot';
import { speak, useSpeechInput } from '@/hooks/useSpeech';
import { CharacterFigure } from '../office/CharacterFigure';
import { TeamInfo } from './TeamInfo';

const EXAMPLES = ['Which PCs are online?', '@nextDev what is everyone doing?', 'Give me a report on Hulk', 'Which tasks need me?'];
const VOICE_LANGS = [
  { id: 'en-US', label: 'EN' },
  { id: 'bn-BD', label: 'বাংলা' },
];

/** The command bot: a chat panel on every page, opened from the round button at the bottom right. */
export function BotPanel() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <BotWindow onClose={() => setOpen(false)} />}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 shadow-xl hover:border-accent"
          aria-label={`Open ${BOT_NAME}, the command bot`}
        >
          <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-[#0c0e13]">
            <CharacterFigure id="jarvis" bust size={34} />
          </span>
          <span className="text-sm font-semibold">{BOT_NAME}</span>
        </button>
      )}
    </>
  );
}

function BotWindow({ onClose }: { onClose: () => void }) {
  const { messages, status, thinking, error, send, answer } = useBot();
  const [team, setTeam] = useState<TeamId | null>(null);
  const [draft, setDraft] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [readAloud, setReadAloud] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || thinking) return;
      setDraft('');
      const reply = await send(clean, team);
      if (reply && readAloud) speak(reply.text);
    },
    [send, team, thinking, readAloud],
  );

  const voice = useSpeechInput(
    useCallback((text: string, final: boolean) => {
      setDraft(text);
      if (final) input.current?.focus();
    }, []),
    voiceLang,
  );

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages?.length, thinking]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const mention = currentMention(draft);
  const suggestions = mention === null ? [] : TEAMS.filter((t) => t.id.toLowerCase().startsWith(mention.toLowerCase()));

  function pickTeam(id: TeamId) {
    setDraft((d) => d.replace(/@([A-Za-z]*)$/, `@${id} `));
    input.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Tab' && suggestions.length > 0) {
      event.preventDefault();
      pickTeam(suggestions[0]!.id);
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit(draft);
    } else if (event.key === 'Escape') {
      onClose();
    }
  }

  const off = status !== null && !status.enabled;

  return (
    <section
      className="fixed bottom-4 right-4 z-40 flex h-[min(720px,calc(100dvh-2rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      aria-label={`${BOT_NAME}, the command bot`}
    >
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5">
        <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-[#0c0e13]">
          <CharacterFigure id="jarvis" bust size={34} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{BOT_NAME} · Command bot</p>
          <p className="truncate text-xs text-muted">{status === null ? 'Connecting…' : off ? 'Off: add ANTHROPIC_API_KEY on the hub PC' : `Claude API · ${status.model}`}</p>
        </div>
        <button
          onClick={() => setReadAloud(!readAloud)}
          aria-pressed={readAloud}
          title={readAloud ? 'Stop reading replies aloud' : 'Read replies aloud'}
          className={`rounded-md px-2 py-1 text-sm ${readAloud ? 'bg-accent-soft text-accent' : 'text-muted hover:text-foreground'}`}
        >
          {readAloud ? '🔊' : '🔈'}
        </button>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-muted hover:text-foreground" aria-label="Close the bot">
          ✕
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 [scrollbar-width:none]" aria-label="Pick a team">
        <TeamChip active={team === null} onClick={() => setTeam(null)}>
          All
        </TeamChip>
        {TEAMS.map((t) => (
          <TeamChip key={t.id} active={team === t.id} onClick={() => setTeam(team === t.id ? null : t.id)} color={t.color}>
            {t.label}
          </TeamChip>
        ))}
      </nav>

      {team && (
        <div className="max-h-[42%] shrink-0 overflow-y-auto overflow-x-hidden">
          <TeamInfo team={team} onAsk={(text) => void submit(text)} />
        </div>
      )}

      <div ref={log} className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-3" role="log" aria-live="polite">
        {messages?.length === 0 && (
          <div className="space-y-2 text-sm text-muted">
            <p>
              Ask me about your PCs, tasks, teams and agents, or give a team work with <span className="font-mono text-foreground">@team</span>, e.g.{' '}
              <span className="font-mono text-foreground">@nextDev add a login page</span>.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => void submit(e)} disabled={off} className="rounded-full border border-line px-2.5 py-1 text-xs hover:text-foreground disabled:opacity-50">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages?.map((m) => <Message key={m.id} message={m} onAnswer={answer} />)}
        {thinking && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden /> {BOT_NAME} is checking…
          </p>
        )}
      </div>

      <footer className="relative border-t border-line p-2.5">
        {suggestions.length > 0 && (
          <ul className="absolute bottom-full left-2.5 mb-1 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-lg" role="listbox" aria-label="Teams">
            {suggestions.map((t) => (
              <li key={t.id}>
                <button onClick={() => pickTeam(t.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-chip">
                  <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />@{t.id}
                  <span className="text-xs text-muted">{t.focus}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {(error || voice.error) && <p className="mb-1.5 text-xs text-danger">{error ?? voice.error}</p>}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={input}
            aria-label={`Message ${BOT_NAME}`}
            rows={Math.min(4, Math.max(1, draft.split('\n').length))}
            value={draft}
            disabled={off}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={voice.listening ? 'Listening…' : team ? `Ask about ${team}, or give it work…` : 'Ask anything, or @team to assign work…'}
            className="min-h-10 flex-1 resize-none rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
          />
          {voice.supported && (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={voice.listening ? voice.stop : voice.start}
                disabled={off}
                aria-pressed={voice.listening}
                title={voice.listening ? 'Stop listening' : 'Speak your message'}
                className={`grid size-10 place-items-center rounded-lg border ${voice.listening ? 'animate-pulse border-danger bg-danger-soft text-danger' : 'border-line text-muted hover:text-foreground'} disabled:opacity-40`}
              >
                🎤
              </button>
              <button
                onClick={() => setVoiceLang(voiceLang === 'en-US' ? 'bn-BD' : 'en-US')}
                className="text-[10px] text-muted hover:text-foreground"
                title="Language you speak in"
              >
                {VOICE_LANGS.find((l) => l.id === voiceLang)!.label}
              </button>
            </div>
          )}
          <button
            onClick={() => void submit(draft)}
            disabled={off || thinking || !draft.trim()}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </footer>
    </section>
  );
}

/** The partial team name after a trailing "@", or null when the draft does not end in a mention. */
function currentMention(draft: string): string | null {
  const match = /(?:^|\s)@([A-Za-z]*)$/.exec(draft);
  return match ? match[1]! : null;
}

function TeamChip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${active ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-foreground'}`}
    >
      {color && <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />}
      {children}
    </button>
  );
}

function Message({ message, onAnswer }: { message: BotMessageView; onAnswer: (messageId: string, actionId: string, confirm: boolean) => void }) {
  const mine = message.role === 'YOU';
  return (
    <div className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine && (
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0c0e13]">
          <CharacterFigure id="jarvis" bust size={26} />
        </span>
      )}
      <div className={`min-w-0 max-w-[85%] space-y-1.5 ${mine ? 'items-end' : ''}`}>
        <p className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] ${mine ? 'rounded-br-sm bg-accent text-white' : 'rounded-bl-sm bg-chip text-foreground'}`}>{message.text}</p>
        {message.actions.map((a) => (
          <ActionCard key={a.id} action={a} onAnswer={(confirm) => onAnswer(message.id, a.id, confirm)} />
        ))}
        <p className={`text-[10px] text-muted ${mine ? 'text-right' : ''}`}>
          {message.team && <span className="mr-1 font-mono">@{message.team}</span>}
          <time dateTime={message.at}>{new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        </p>
      </div>
    </div>
  );
}

const ACTION_TEXT = { cancel: 'Cancel task', approve: 'Approve the plan of', instruct: 'Send an instruction to' } as const;

function ActionCard({ action, onAnswer }: { action: BotAction; onAnswer: (confirm: boolean) => void }) {
  const [busy, setBusy] = useState(false);

  if (action.kind === 'task-created') {
    return (
      <div className="rounded-xl border border-ok/40 bg-ok-soft px-3 py-2 text-sm">
        <p>
          ✓ Task created for <span className="font-mono">@{action.team}</span>: <span className="font-medium">{action.title}</span>
        </p>
        <Link href={`/tasks/${action.taskId}`} className="text-xs font-medium text-accent hover:underline">
          Open the brief and answer Friday →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-sm">
      <p>
        {ACTION_TEXT[action.action]} <span className="font-medium">“{action.title}”</span>?
      </p>
      {action.text && <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface/70 px-2 py-1 text-xs">{action.text}</p>}
      {action.answer === null ? (
        <div className="mt-2 flex gap-2">
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onAnswer(true);
            }}
            className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onAnswer(false);
            }}
            className="rounded-md border border-line px-3 py-1 text-xs disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className={`mt-1 text-xs ${action.error ? 'text-danger' : 'text-muted'}`}>
          {action.answer === 'declined' ? 'You cancelled this.' : action.error ? `Failed: ${action.error}` : 'Done.'}{' '}
          <Link href={`/tasks/${action.taskId}`} className="text-accent hover:underline">
            Open task
          </Link>
        </p>
      )}
    </div>
  );
}
