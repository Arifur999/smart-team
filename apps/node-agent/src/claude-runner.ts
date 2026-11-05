import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import {
  FIRST_AGENT_SEQ,
  type LogEntry,
  type LogKind,
  type RunFinishedPayload,
  type RunStartPayload,
} from '@smart-team/shared';
import { parseStreamLine, type FinalResult } from './claude-stream.js';
import type { ClaudeConfig } from './config.js';
import { resolveAllowedDir } from './folder-guard.js';

/** Added to plan runs so the plan comes back as the final answer, ready for approval in the dashboard. */
const PLAN_SYSTEM_PROMPT = [
  'You are the planning agent of a team. Read and explore as much as you need, but do not change anything.',
  'Your final reply must be the complete plan in Markdown: context, numbered steps with the files involved, risks, and how the result will be checked.',
  'The plan is approved by a person in a dashboard, not through ExitPlanMode.',
].join(' ');

const FLUSH_MS = 250;
const STDERR_KEEP = 2_000;

export interface RunCallbacks {
  onLogs(entries: LogEntry[]): void;
  onFinished(result: Omit<RunFinishedPayload, 'runId'>): void;
}

/** Builds the Claude Code command line for one run. The prompt goes over stdin, never on the command line. */
export function buildClaudeArgs(run: Pick<RunStartPayload, 'mode' | 'resumeSessionId'>, claude: ClaudeConfig): string[] {
  const args = ['-p', '--output-format', 'stream-json', '--verbose'];
  if (run.mode === 'PLAN') {
    args.push('--permission-mode', 'plan', '--append-system-prompt', PLAN_SYSTEM_PROMPT);
  } else {
    args.push('--permission-mode', claude.permissionMode);
    if (claude.allowedTools.length > 0) args.push('--allowedTools', ...claude.allowedTools);
  }
  if (claude.maxTurns) args.push('--max-turns', String(claude.maxTurns));
  if (run.resumeSessionId) args.push('--resume', run.resumeSessionId);
  return args;
}

/** Runs one Claude Code session at a time and streams its output as log entries. */
export class ClaudeRunner {
  private current?: { runId: string; child: ChildProcess; cancelled: boolean };

  constructor(
    private readonly claude: ClaudeConfig,
    private readonly sharedFolders: () => string[],
  ) {}

  get busy(): boolean {
    return this.current !== undefined;
  }

  start(run: RunStartPayload, callbacks: RunCallbacks): void {
    let seq = FIRST_AGENT_SEQ;
    const now = () => new Date().toISOString();
    const reject = (text: string) => {
      callbacks.onLogs([{ seq, kind: 'error', text, at: now() }]);
      callbacks.onFinished({ status: 'FAILED', outcome: text });
    };

    if (this.current) return reject('This PC is already running another task.');
    const cwd = resolveAllowedDir(run.workDir, this.sharedFolders());
    if (!cwd) return reject(`The folder ${run.workDir} is not shared on this PC, or does not exist.`);

    const child = spawn(this.claude.command, buildClaudeArgs(run, this.claude), { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const state = { runId: run.runId, child, cancelled: false };
    this.current = state;

    let pending: LogEntry[] = [];
    let final: FinalResult | undefined;
    let sessionId: string | undefined;
    let stderrTail = '';

    const push = (kind: LogKind, text: string) => pending.push({ seq: seq++, kind, text, at: now() });
    const flush = () => {
      if (pending.length === 0) return;
      callbacks.onLogs(pending);
      pending = [];
    };
    const timer = setInterval(flush, FLUSH_MS);

    createInterface({ input: child.stdout! }).on('line', (line) => {
      sessionId ??= readSessionId(line);
      const parsed = parseStreamLine(line);
      for (const l of parsed.lines) push(l.kind, l.text);
      if (parsed.final) final = parsed.final;
    });
    child.stderr!.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_KEEP);
    });

    child.stdin!.end(run.prompt);

    let done = false;
    const finish = (exitCode: number | null, spawnError?: Error) => {
      if (done) return;
      done = true;
      clearInterval(timer);

      const result = outcomeOf({ cancelled: state.cancelled, final, exitCode, stderrTail, spawnError });
      if (result.status !== 'SUCCEEDED' && result.outcome && !final) push('error', result.outcome);
      flush();
      if (this.current === state) this.current = undefined;
      callbacks.onFinished({ ...result, ...(sessionId ? { sessionId } : {}), ...(final?.costUsd !== undefined ? { costUsd: final.costUsd } : {}) });
    };

    child.on('error', (error) => finish(null, error));
    child.on('close', (code) => finish(code));
  }

  /** Stops the run if it is the one going. Returns false when it is not. */
  cancel(runId?: string): boolean {
    const current = this.current;
    if (!current || (runId && current.runId !== runId)) return false;
    current.cancelled = true;
    killTree(current.child);
    return true;
  }
}

export function outcomeOf(input: {
  cancelled: boolean;
  final?: FinalResult;
  exitCode: number | null;
  stderrTail: string;
  spawnError?: Error;
}): Pick<RunFinishedPayload, 'status' | 'outcome'> {
  if (input.cancelled) return { status: 'CANCELLED', outcome: 'Cancelled from the dashboard.' };
  if (input.spawnError) return { status: 'FAILED', outcome: `Could not start Claude Code: ${input.spawnError.message}` };
  if (input.final) return { status: input.final.isError ? 'FAILED' : 'SUCCEEDED', outcome: input.final.text };
  const stderr = input.stderrTail.trim();
  return { status: 'FAILED', outcome: stderr || `Claude Code exited with code ${input.exitCode ?? 'unknown'} before finishing.` };
}

function readSessionId(line: string): string | undefined {
  const match = line.match(/"session_id"\s*:\s*"([^"]+)"/);
  return match?.[1];
}

/** Claude may have started its own tools; stop the whole process tree, not just Claude. */
function killTree(child: ChildProcess) {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill('SIGTERM');
  }
}
