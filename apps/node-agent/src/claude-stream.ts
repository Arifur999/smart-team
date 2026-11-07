import { MAX_LOG_TEXT, type LogKind, type TokenUsage } from '@smart-team/shared';

export interface ParsedLine {
  kind: LogKind;
  text: string;
}

export interface FinalResult {
  isError: boolean;
  text: string;
  /** Claude's result subtype, e.g. "success" or "error_max_turns". */
  subtype?: string;
  costUsd?: number;
  /** The session's token total, when Claude reports it. */
  usage?: TokenUsage;
}

export interface ParsedEvent {
  lines: ParsedLine[];
  final?: FinalResult;
  /** Tokens of one API message. The same message can arrive several times; keep the latest per id. */
  messageUsage?: { messageId: string; usage: TokenUsage };
  /** The account hit its Claude usage limit; resetsAt (ISO) when Claude says. */
  limit?: { resetsAt?: string };
}

/** How Claude words a usage-limit stop when there is no rate-limit event to go by. */
const USAGE_LIMIT_TEXT = /usage limit|limit reached|hit your limit/i;

/** Claude reports the reset as epoch seconds; returns ISO time, or undefined. */
function resetTime(raw: unknown): string | undefined {
  const seconds = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : undefined;
}

/** Reads Claude's usage object; null when it is missing. */
export function readUsage(raw: unknown): TokenUsage | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return {
    input: n(u.input_tokens),
    output: n(u.output_tokens),
    cacheRead: n(u.cache_read_input_tokens),
    cacheCreation: n(u.cache_creation_input_tokens),
  };
}

/** Turns one line of `claude -p --output-format stream-json` into readable log lines. */
export function parseStreamLine(raw: string): ParsedEvent {
  let event: Record<string, any>;
  try {
    event = JSON.parse(raw);
  } catch {
    return raw.trim() ? { lines: [{ kind: 'status', text: clip(raw.trim()) }] } : { lines: [] };
  }

  switch (event.type) {
    case 'system':
      if (event.subtype === 'init') {
        return { lines: [{ kind: 'status', text: `Session started in ${event.cwd}${event.model ? ` (${event.model})` : ''}` }] };
      }
      if (event.subtype === 'post_turn_summary' && event.status_detail) {
        return { lines: [{ kind: 'status', text: clip(String(event.status_detail)) }] };
      }
      return { lines: [] };

    case 'assistant': {
      const usage = readUsage(event.message?.usage);
      const messageId = event.message?.id;
      return {
        lines: contentParts(event.message?.content).flatMap(assistantPart),
        ...(usage && typeof messageId === 'string' ? { messageUsage: { messageId, usage } } : {}),
      };
    }

    case 'user':
      return { lines: contentParts(event.message?.content).flatMap(toolResultPart) };

    case 'rate_limit_event': {
      // "allowed_warning" only means the account is getting close; "rejected" means it hit the limit.
      const status = String(event.rate_limit_info?.status ?? '');
      if (status === 'rejected') {
        const resetsAt = resetTime(event.rate_limit_info?.resetsAt);
        return {
          lines: [{ kind: 'error', text: `Claude usage limit reached on this account${resetsAt ? `; it resets at ${resetsAt}` : ''}.` }],
          limit: resetsAt ? { resetsAt } : {},
        };
      }
      return status.startsWith('allowed_warning')
        ? { lines: [{ kind: 'status', text: 'Claude usage on this account is close to its limit.' }] }
        : { lines: [] };
    }

    case 'result': {
      const isError = event.is_error === true || (typeof event.subtype === 'string' && event.subtype !== 'success');
      const text = typeof event.result === 'string' && event.result ? event.result : isError ? `Run ended: ${event.subtype}` : 'Done.';
      // On success the result repeats Claude's last message, which is already in the log.
      return {
        lines: [isError ? { kind: 'error', text: clip(text) } : { kind: 'result', text: finishedLine(event) }],
        ...(isError && USAGE_LIMIT_TEXT.test(text) ? { limit: {} } : {}),
        final: {
          isError,
          text,
          ...(typeof event.subtype === 'string' ? { subtype: event.subtype } : {}),
          ...(typeof event.total_cost_usd === 'number' ? { costUsd: event.total_cost_usd } : {}),
          ...(readUsage(event.usage) ? { usage: readUsage(event.usage)! } : {}),
        },
      };
    }

    default:
      return { lines: [] };
  }
}

function finishedLine(event: Record<string, any>): string {
  const parts = ['Finished'];
  if (typeof event.duration_ms === 'number') parts.push(`in ${Math.round(event.duration_ms / 1000)}s`);
  if (typeof event.num_turns === 'number') parts.push(`· ${event.num_turns} turns`);
  if (typeof event.total_cost_usd === 'number') parts.push(`· $${event.total_cost_usd.toFixed(2)}`);
  return parts.join(' ');
}

function contentParts(content: unknown): Record<string, any>[] {
  return Array.isArray(content) ? content : [];
}

function assistantPart(part: Record<string, any>): ParsedLine[] {
  if (part.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
    return [{ kind: 'text', text: clip(part.text.trim()) }];
  }
  if (part.type === 'tool_use') {
    return [{ kind: 'tool', text: clip(describeToolCall(String(part.name), part.input ?? {})) }];
  }
  return [];
}

function toolResultPart(part: Record<string, any>): ParsedLine[] {
  if (part.type !== 'tool_result') return [];
  const text = typeof part.content === 'string'
    ? part.content
    : contentParts(part.content).map((c) => (typeof c.text === 'string' ? c.text : '')).join('\n');
  if (!text.trim()) return [];
  return [{ kind: part.is_error ? 'error' : 'tool_result', text: clip(text.trim()) }];
}

/** "Edit: src/app.ts" reads better in a live log than the raw JSON input. */
export function describeToolCall(name: string, input: Record<string, unknown>): string {
  const detail = ['command', 'file_path', 'path', 'pattern', 'url', 'description', 'prompt']
    .map((key) => input[key])
    .find((value): value is string => typeof value === 'string' && value.length > 0);
  return detail ? `${name}: ${detail}` : name;
}

function clip(text: string): string {
  return text.length > MAX_LOG_TEXT ? `${text.slice(0, MAX_LOG_TEXT)}… (cut)` : text;
}
