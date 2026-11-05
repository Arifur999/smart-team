import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import {
  FIRST_AGENT_SEQ,
  type LogEntry,
  type LogKind,
  type RunFinishedPayload,
  type RunStartPayload,
  type TokenUsage,
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

/** Added to the intake agent's brief check: read-only, and the answer must be the JSON the hub asked for. */
const INTAKE_SYSTEM_PROMPT = [
  'You are the intake agent of a team. You only review briefs; you never plan, do the work or change anything.',
  'Your final reply must be exactly the JSON object the user message asks for, with no text before or after it.',
].join(' ');

/**
 * Added to work runs. Nobody watches a run as it goes: the user gives requirements, the team does the rest.
 * So the agent must get past errors itself instead of ending the run with a question or a command to type.
 */
const WORK_SYSTEM_PROMPT = [
  'You are a member of an autonomous team working unattended on this PC. Nobody watches the terminal: no one can answer a question, approve a command or run anything for you during this run.',
  'You have full access to this PC. Install missing tools or packages, run any command you need, and change your approach when something does not work.',
  'When a command or step fails, read the error, fix the cause and carry on. Retry with a different method if needed. Never stop to ask for permission, never ask the user to run a command, and never tell them to change settings such as /permissions.',
  `This PC runs ${process.platform === 'win32' ? 'Windows: use Windows paths, and keep temporary files inside the working folder, not /tmp' : process.platform}.`,
  'Only end the run early if the work truly cannot continue without information that only the user has; then say exactly what is missing. Otherwise finish the work and summarize what you did.',
].join(' ');

const FLUSH_MS = 250;
const STDERR_KEEP = 2_000;

export interface RunCallbacks {
  /** `usage` is the run's token total, sent only when it changed. */
  onLogs(entries: LogEntry[], usage?: TokenUsage): void;
  onFinished(result: Omit<RunFinishedPayload, 'runId'>): void;
}

export interface RunOptions {
  /** A plugin folder with the run's skills, from SkillCache. */
  pluginDir?: string;
  /** Extra folders Claude may read: the brief's files, from AssetCache. */
  addDirs?: string[];
  /** Appended to the prompt, e.g. where the brief's files are on this PC. */
  promptSuffix?: string;
  /** Lines shown in the terminal before Claude starts, e.g. which skills were loaded. */
  notes?: string[];
}

/** Builds the Claude Code command line for one run. The prompt goes over stdin, never on the command line. */
export function buildClaudeArgs(
  run: Pick<RunStartPayload, 'mode' | 'resumeSessionId'>,
  claude: ClaudeConfig,
  pluginDir?: string,
  addDirs: string[] = [],
): string[] {
  const args = ['-p', '--output-format', 'stream-json', '--verbose'];
  if (pluginDir) args.push('--plugin-dir', pluginDir);
  for (const dir of addDirs) args.push('--add-dir', dir);
  if (run.mode === 'INTAKE') {
    args.push('--permission-mode', 'plan', '--append-system-prompt', INTAKE_SYSTEM_PROMPT);
  } else if (run.mode === 'PLAN') {
    args.push('--permission-mode', 'plan', '--append-system-prompt', PLAN_SYSTEM_PROMPT);
  } else {
    args.push('--permission-mode', claude.permissionMode, '--append-system-prompt', WORK_SYSTEM_PROMPT);
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

  start(run: RunStartPayload, callbacks: RunCallbacks, options: RunOptions = {}): void {
    let seq = FIRST_AGENT_SEQ;
    const now = () => new Date().toISOString();
    const reject = (text: string) => {
      callbacks.onLogs([{ seq, kind: 'error', text, at: now() }]);
      callbacks.onFinished({ status: 'FAILED', outcome: text });
    };

    if (this.current) return reject('This PC is already running another task.');
    const cwd = resolveAllowedDir(run.workDir, this.sharedFolders());
    if (!cwd) return reject(`The folder ${run.workDir} is not shared on this PC, or does not exist.`);

    const child = spawn(this.claude.command, buildClaudeArgs(run, this.claude, options.pluginDir, options.addDirs), {
      cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const state = { runId: run.runId, child, cancelled: false };
    this.current = state;

    let pending: LogEntry[] = [];
    let final: FinalResult | undefined;
    let sessionId: string | undefined;
    let stderrTail = '';
    const tokens = new UsageTally();

    const push = (kind: LogKind, text: string) => pending.push({ seq: seq++, kind, text, at: now() });
    const flush = () => {
      const usage = tokens.takeIfChanged();
      if (pending.length === 0 && !usage) return;
      callbacks.onLogs(pending, usage);
      pending = [];
    };
    for (const note of options.notes ?? []) push('status', note);
    const timer = setInterval(flush, FLUSH_MS);

    createInterface({ input: child.stdout! }).on('line', (line) => {
      sessionId ??= readSessionId(line);
      const parsed = parseStreamLine(line);
      for (const l of parsed.lines) push(l.kind, l.text);
      if (parsed.messageUsage) tokens.record(parsed.messageUsage.messageId, parsed.messageUsage.usage);
      if (parsed.final) final = parsed.final;
    });
    child.stderr!.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_KEEP);
    });

    child.stdin!.end(options.promptSuffix ? `${run.prompt}\n${options.promptSuffix}` : run.prompt);

    let done = false;
    const finish = (exitCode: number | null, spawnError?: Error) => {
      if (done) return;
      done = true;
      clearInterval(timer);

      const result = outcomeOf({ cancelled: state.cancelled, final, exitCode, stderrTail, spawnError });
      if (result.status !== 'SUCCEEDED' && result.outcome && !final) push('error', result.outcome);
      flush();
      if (this.current === state) this.current = undefined;
      // Claude's own total wins; a cancelled run has none, so fall back to what was counted live.
      const usage = final?.usage ?? tokens.total();
      callbacks.onFinished({
        ...result,
        usage,
        ...(sessionId ? { sessionId } : {}),
        ...(final?.costUsd !== undefined ? { costUsd: final.costUsd } : {}),
      });
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

/**
 * Adds up tokens per API message. Claude repeats a message's usage on every content block it streams,
 * so the latest value per message id replaces the earlier one instead of being added again.
 */
export class UsageTally {
  private readonly byMessage = new Map<string, TokenUsage>();
  private lastSent = '';

  record(messageId: string, usage: TokenUsage) {
    this.byMessage.set(messageId, usage);
  }

  total(): TokenUsage {
    const sum: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    for (const u of this.byMessage.values()) {
      sum.input += u.input;
      sum.output += u.output;
      sum.cacheRead += u.cacheRead;
      sum.cacheCreation += u.cacheCreation;
    }
    return sum;
  }

  /** The total if it changed since the last call, otherwise undefined. */
  takeIfChanged(): TokenUsage | undefined {
    if (this.byMessage.size === 0) return undefined;
    const total = this.total();
    const key = JSON.stringify(total);
    if (key === this.lastSent) return undefined;
    this.lastSent = key;
    return total;
  }
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
