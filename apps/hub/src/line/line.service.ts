import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  fillStagePath,
  lineByKey,
  mainGate,
  memberById,
  memberSkillKeys,
  TEAMS,
  YOU,
  type FixNote,
  type LineDef,
  type LineSettings,
  type RunRole,
  type SendBackInput,
  type SkipWhen,
  type StageDef,
  type TeamId,
  type Verdict,
} from '@smart-team/shared';
import { getEnv } from '../env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AssetsService } from '../intake/assets.service.js';
import { RunDispatcher, type RunEndedEvent } from '../orchestration/run-dispatcher.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { briefAnswers, briefFiles } from './brief-files.js';
import { parseHouseRules, rulesFor, type HouseRule } from './house-rules.js';
import {
  buildDetour,
  decideAfterRun,
  detourStart,
  gateAfter,
  nextAfterDone,
  rejoinFor,
  skipReason,
  type Decision,
  type Entry,
  type Route,
  type RunFailureKind,
  type StepLite,
  type StepReason,
} from './line-router.js';
import { lineResumeSession } from './resume-rule.js';
import { readSettings, skipFlags } from './settings.js';
import { stagePrompt, stageSystemPrompt, writeScope, type EarlierStage } from './stage-prompts.js';
import { notesFromYou } from './verdict.js';
import { absTaskFolder, taskFolderName } from './task-folder.js';

type Tx = Prisma.TransactionClient;

/** What to do once a decision is stored and the task's lock is released. */
interface Effects {
  kick?: string;
  cancelRunId?: string;
}

const RECONCILE_MS = 30_000;
/** A finished line run is only picked up by reconcile when its own handler had time to route it. */
const ROUTE_GRACE_MS = 10_000;

const KIND = { work: 'WORK', gate: 'GATE', check: 'CHECK' } as const;

/** Everything a decision about one task needs, loaded once inside its transaction. */
interface Ctx {
  task: { id: string; title: string; team: TeamId; deviceId: string; workDir: string; folder: string | null; createdAt: Date };
  line: LineDef;
  settings: LineSettings;
  flags: SkipWhen[];
  brief: { summary: string | null; answers: Record<string, string> };
  steps: (StepLite & { ownerId: string; summary: string | null; result: unknown; notes: FixNote[]; kind: 'WORK' | 'GATE' | 'CHECK' })[];
}

/**
 * Runs tasks along their production line: one member per stage, gates that send work back with notes, and
 * your checks. Every decision about a task is taken under that task's lock in one transaction, so two run
 * ends or a run end and your click cannot both act; side effects (dispatching, cancelling) happen after.
 */
@Injectable()
export class LineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LineService.name);
  private readonly locks = new Map<string, Promise<unknown>>();
  private readonly stuck = new Map<string, boolean>();
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: RunDispatcher,
    private readonly assets: AssetsService,
  ) {}

  onModuleInit() {
    this.runs.onRunEnded((event) => this.onRunEnded(event));
    this.timer = setInterval(() => void this.reconcile(), RECONCILE_MS);
    this.timer.unref?.();
    setTimeout(() => void this.reconcile(), 3_000).unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  // ---- Starting ----

  /** The brief is confirmed: give the task its folder and settings and send it to its first stage. */
  async start(taskId: string): Promise<void> {
    await this.handle(taskId, async (tx) => {
      const ctx = await this.context(tx, taskId);
      if (ctx.steps.length > 0) return {};
      const folder = ctx.task.folder ?? taskFolderName(ctx.task.title, ctx.task.id, ctx.task.createdAt);
      await tx.task.update({ where: { id: taskId }, data: { folder, lineSettings: ctx.settings as unknown as Prisma.InputJsonValue } });
      ctx.task.folder = folder;
      const brief = ctx.line.stages[0]!;
      const step = await this.createStep(tx, ctx, brief, { stage: brief.key, reason: 'line', notes: [], causedById: null }, 'DONE', {
        decidedBy: YOU,
        summary: 'Brief confirmed.',
        finishedAt: new Date(),
      });
      return this.enter(tx, ctx, nextAfterDone(step, ctx.steps, ctx.line));
    });
  }

  // ---- A run ended ----

  private async onRunEnded({ taskId, runId }: RunEndedEvent): Promise<void> {
    try {
      await this.handle(taskId, (tx) => this.route(tx, runId));
    } catch (error) {
      this.logger.error(`could not route run ${runId} of task ${taskId}`, error);
    }
  }

  private async route(tx: Tx, runId: string): Promise<Effects> {
    const run = await tx.run.findUnique({
      where: { id: runId },
      select: { id: true, taskId: true, stepId: true, status: true, outcome: true, failure: true, report: true, sessionId: true, attempt: true },
    });
    if (!run?.stepId || run.status === 'QUEUED' || run.status === 'RUNNING') return {};
    const claimed = await tx.run.updateMany({ where: { id: runId, routedAt: null }, data: { routedAt: new Date() } });
    if (claimed.count === 0) return {};

    const ctx = await this.context(tx, run.taskId);
    const step = ctx.steps.find((s) => s.id === run.stepId);
    if (!step || step.status !== 'ACTIVE') return {};
    const newest = await tx.run.findFirst({ where: { stepId: step.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
    if (newest?.id !== run.id) return {};

    const attempts = await tx.run.findMany({ where: { stepId: step.id }, select: { failure: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    const stage = this.stageOf(ctx, step.stage);
    const report = (run.report ?? {}) as { missing?: string[]; retryAt?: string };
    const decision = decideAfterRun(
      { line: ctx.line, stage, step, steps: ctx.steps, settings: ctx.settings, flags: ctx.flags, attempts: attempts.map((a) => (a.failure as RunFailureKind | null) ?? null), now: new Date() },
      {
        status: run.status === 'SUCCEEDED' ? 'SUCCEEDED' : run.status === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
        failure: (run.failure as RunFailureKind | null) ?? (run.status === 'FAILED' ? 'error' : null),
        outcome: run.outcome ?? '',
        missing: report.missing ?? [],
        hasSession: Boolean(run.sessionId),
        retryAt: report.retryAt ?? null,
      },
    );
    return this.apply(tx, ctx, step, decision, run.sessionId, run.attempt);
  }

  private async apply(tx: Tx, ctx: Ctx, step: Ctx['steps'][number], d: Decision, sessionId: string | null, attempt: number): Promise<Effects> {
    const now = new Date();
    switch (d.kind) {
      case 'ignore':
        return {};
      case 'retry':
        return this.queueRun(tx, ctx, step, { attempt: attempt + 1, retryOf: d.resume ? sessionId : null, note: d.note });
      case 'pause':
        await tx.task.update({ where: { id: ctx.task.id }, data: { resumeAt: d.until } });
        await tx.lineStep.update({ where: { id: step.id }, data: { comment: `Paused for the Claude usage limit until ${d.until.toISOString()}.` } });
        // The same attempt runs again once the limit resets (claimNextQueued waits for resumeAt).
        return this.queueRun(tx, ctx, step, { attempt: attempt + 1, retryOf: sessionId, note: 'The usage limit has reset. Check what is already done and finish the stage.' });
      case 'blocked':
        await this.finishStep(tx, step.id, 'WAITING', { comment: d.reason });
        return {};
      case 'done':
        await this.finishStep(tx, step.id, 'DONE', { summary: d.summary, result: d.report, decidedBy: step.ownerId, finishedAt: now });
        return this.enter(tx, ctx, nextAfterDone(step, ctx.steps, ctx.line));
      case 'pass':
        await this.finishStep(tx, step.id, 'DONE', { summary: d.verdict.summary, result: d.verdict, score: d.verdict.score, decidedBy: step.ownerId, finishedAt: now });
        return this.enter(tx, ctx, nextAfterDone({ ...step, reason: 'line' }, ctx.steps, ctx.line));
      case 'continue':
        await this.finishStep(tx, step.id, 'DONE', {
          summary: `${d.verdict.summary}${d.verdict.summary ? ' ' : ''}(${d.reason})`,
          result: d.verdict,
          score: d.verdict.score,
          comment: d.reason,
          decidedBy: step.ownerId,
          finishedAt: now,
        });
        return this.enter(tx, ctx, nextAfterDone({ ...step, reason: 'line' }, ctx.steps, ctx.line));
      case 'fix':
        await this.finishStep(tx, step.id, 'SENT_BACK', { summary: d.verdict.summary, result: d.verdict, score: d.verdict.score, route: d.route, decidedBy: step.ownerId, finishedAt: now });
        return this.enter(tx, ctx, detourStart(step.id, d.route));
      case 'escalate':
        await this.finishStep(tx, step.id, 'WAITING', { result: d.verdict, score: d.verdict?.score ?? null, comment: d.reason });
        return {};
    }
  }

  // ---- Your actions ----

  /** You approve the step waiting for you (a check, or a gate that could not decide). */
  async approve(taskId: string, comment?: string): Promise<void> {
    await this.handle(taskId, async (tx) => {
      const ctx = await this.context(tx, taskId);
      const step = this.current(ctx);
      if (!step || step.status !== 'WAITING' || (step.kind !== 'CHECK' && step.kind !== 'GATE')) throw new ConflictException('Nothing is waiting for your approval.');
      await this.finishStep(tx, step.id, 'DONE', { decidedBy: YOU, comment: comment?.trim() || null, finishedAt: new Date() });
      if (this.stageOf(ctx, step.stage).final) return {};
      return this.enter(tx, ctx, nextAfterDone({ ...step, reason: step.kind === 'GATE' ? 'line' : step.reason }, ctx.steps, ctx.line));
    });
  }

  /**
   * You send work back with notes. From a check, the stage before it is redone; from the final review (or a
   * finished task), either the stage you picked and everything after it, or, without a stage, the critic turns
   * your notes into routed fixes. A gate that could not decide gets its own fixes plus your notes.
   */
  async sendBack(taskId: string, input: SendBackInput): Promise<void> {
    const items = [...(input.items ?? []), ...(input.notes.trim() ? [{ text: input.notes.trim() }] : [])];
    if (items.length === 0) throw new BadRequestException('Write what should change.');
    await this.handle(taskId, async (tx) => {
      const ctx = await this.context(tx, taskId);
      const step = this.current(ctx);
      if (!step) throw new ConflictException('This task has not started on its line yet.');
      const stage = this.stageOf(ctx, step.stage);
      const done = step.status === 'DONE' && stage.final;
      if (step.status !== 'WAITING' && !done) throw new ConflictException('Nothing is waiting for you right now.');
      const isSkipped = (s: StageDef) => skipReason(s, ctx.settings, ctx.flags) !== null;
      const main = mainGate(ctx.line);

      let picked = input.stage ? ctx.line.stages.find((s) => s.key === input.stage && s.kind === 'work') : undefined;
      if (input.stage && !picked) throw new BadRequestException(`"${input.stage}" is not a stage you can send work back to.`);
      // From a check before the main gate, the work just before the check is redone.
      if (!picked && stage.kind === 'check' && !stage.final) picked = [...ctx.line.stages.slice(0, ctx.line.stages.indexOf(stage))].reverse().find((s) => s.kind === 'work');

      const close = (status: 'DONE' | 'SENT_BACK', route: Route | null) =>
        this.finishStep(tx, step.id, status, { decidedBy: YOU, comment: items.map((i) => i.text).join('\n'), route, finishedAt: new Date() });

      if (stage.kind === 'gate') {
        const verdict = (step as { result: unknown }).result as Verdict | null;
        const fixes = [...(verdict?.fixes ?? []), ...notesFromYou(items, picked?.key ?? stage.gate!.defaultFix)].filter((f) => stage.gate!.fixTargets.includes(f.stage));
        const route = buildDetour(ctx.line, fixes, rejoinFor(ctx.line, fixes.map((f) => f.stage), stage.key), isSkipped);
        if (!route) throw new ConflictException('There is nothing to redo for these notes.');
        await close('SENT_BACK', route);
        return this.enter(tx, ctx, detourStart(step.id, route));
      }

      if (picked) {
        // From your own check you see the redone work again; from the final review it is judged by the gates again.
        const rejoin = stage.final ? rejoinFor(ctx.line, [picked.key], gateAfter(ctx.line, [picked.key]) ?? stage.key) : stage.key;
        const fixes = notesFromYou(items, picked.key);
        const route = buildDetour(ctx.line, fixes, rejoin, isSkipped);
        if (!route) throw new ConflictException(`${picked.label} is switched off for this task.`);
        await close('SENT_BACK', route);
        return this.enter(tx, ctx, detourStart(step.id, route));
      }

      if (!main) throw new BadRequestException('Pick the stage that should redo the work.');
      // No stage picked at the review: the critic turns your notes into fixes (a triage round, not counted).
      await close('DONE', null);
      return this.enter(tx, ctx, { stage: main.key, reason: 'triage', notes: notesFromYou(items, main.gate!.defaultFix), causedById: step.id });
    });
  }

  /** You ask a stopped or paused stage to try again, optionally with an instruction. */
  async retry(taskId: string, instruction?: string): Promise<void> {
    await this.handle(taskId, async (tx) => {
      const ctx = await this.context(tx, taskId);
      const step = this.current(ctx);
      if (!step || step.kind === 'CHECK' || (step.status !== 'WAITING' && step.status !== 'ACTIVE')) throw new ConflictException('There is no stopped stage to retry.');
      const active = await tx.run.findFirst({ where: { stepId: step.id, status: { in: ['QUEUED', 'RUNNING'] } }, select: { id: true, status: true } });
      if (active?.status === 'RUNNING') throw new ConflictException('This stage is running right now.');
      await tx.task.update({ where: { id: taskId }, data: { resumeAt: null } });
      if (active) return { kick: ctx.task.deviceId };
      const last = await tx.run.findFirst({ where: { stepId: step.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { attempt: true, sessionId: true } });
      await tx.lineStep.update({ where: { id: step.id }, data: { status: 'ACTIVE', comment: null } });
      const note = instruction?.trim() ? `The client says: ${instruction.trim()}` : 'Try again: check what is already done and finish the stage.';
      return this.queueRun(tx, ctx, { ...step, status: 'ACTIVE' }, { attempt: (last?.attempt ?? 0) + 1, retryOf: last?.sessionId ?? null, note });
    });
  }

  /** You skip a stopped stage and let the line go on without it. */
  async skip(taskId: string): Promise<void> {
    await this.handle(taskId, async (tx) => {
      const ctx = await this.context(tx, taskId);
      const step = this.current(ctx);
      if (!step || step.status !== 'WAITING' || step.kind === 'CHECK') throw new ConflictException('There is no stopped stage to skip.');
      await this.finishStep(tx, step.id, 'SKIPPED', { decidedBy: YOU, comment: 'Skipped by you.', finishedAt: new Date() });
      return this.enter(tx, ctx, nextAfterDone(step, ctx.steps, ctx.line));
    });
  }

  /** Cancels the task: its open step stops, and its run is stopped outside the lock. */
  async cancel(taskId: string): Promise<void> {
    await this.handle(taskId, async (tx) => {
      const ctx = await this.context(tx, taskId);
      const step = this.current(ctx);
      const active = await tx.run.findFirst({ where: { taskId, status: { in: ['QUEUED', 'RUNNING'] } }, select: { id: true } });
      if (step && (step.status === 'ACTIVE' || step.status === 'WAITING')) {
        await this.finishStep(tx, step.id, 'CANCELLED', { decidedBy: YOU, comment: 'Cancelled by you.', finishedAt: new Date() });
      }
      return active ? { cancelRunId: active.id } : {};
    });
  }

  /** Text typed into the task's terminal: notes at your check, an instruction for a stopped stage. */
  async instruct(taskId: string, text: string): Promise<void> {
    const line = await this.lineSummary(taskId);
    if (line === 'waiting' || line === 'done') return this.sendBack(taskId, { notes: text });
    if (line === 'blocked' || line === 'paused') return this.retry(taskId, text);
    throw new ConflictException('A member is working on this stage; send notes when it waits for you.');
  }

  async updateSettings(taskId: string, patch: Partial<LineSettings>): Promise<void> {
    await this.handle(taskId, async (tx) => {
      const ctx = await this.context(tx, taskId);
      const settings = readSettings({ ...ctx.settings, ...patch }, ctx.line);
      await tx.task.update({ where: { id: taskId }, data: { lineSettings: settings as unknown as Prisma.InputJsonValue } });
      return {};
    });
  }

  // ---- Keeping lines moving ----

  /** Routes line runs whose end was missed (hub restart, a failed handler) and shows stuck stages. */
  async reconcile(): Promise<void> {
    try {
      const missed = await this.prisma.run.findMany({
        where: { stepId: { not: null }, routedAt: null, status: { in: ['SUCCEEDED', 'FAILED', 'CANCELLED'] }, finishedAt: { lt: new Date(Date.now() - ROUTE_GRACE_MS) } },
        select: { id: true, taskId: true, deviceId: true },
        take: 20,
      });
      for (const run of missed) await this.onRunEnded({ taskId: run.taskId, runId: run.id, deviceId: run.deviceId });

      // Paused tasks whose usage limit has reset: wake their PC.
      const due = await this.prisma.task.findMany({ where: { resumeAt: { lte: new Date() } }, select: { id: true, deviceId: true } });
      for (const task of due) {
        await this.prisma.task.update({ where: { id: task.id }, data: { resumeAt: null } });
        if (task.deviceId) this.runs.kick(task.deviceId);
        await this.runs.refresh(task.id);
      }

      // Running line stages: tell dashboards when one turns stuck or comes back.
      const running = await this.prisma.run.findMany({ where: { stepId: { not: null }, status: 'RUNNING' }, select: { taskId: true, updatedAt: true } });
      const now = Date.now();
      const seen = new Set<string>();
      for (const run of running) {
        seen.add(run.taskId);
        const isStuck = now - run.updatedAt.getTime() > 15 * 60_000;
        if (this.stuck.get(run.taskId) !== isStuck) {
          this.stuck.set(run.taskId, isStuck);
          await this.runs.refresh(run.taskId);
        }
      }
      for (const taskId of this.stuck.keys()) if (!seen.has(taskId)) this.stuck.delete(taskId);
    } catch (error) {
      this.logger.error('reconcile failed', error);
    }
  }

  // ---- Internals ----

  private async handle(taskId: string, decide: (tx: Tx) => Promise<Effects>): Promise<void> {
    const effects = await this.locked(taskId, () => this.prisma.$transaction(decide, { timeout: 30_000, maxWait: 10_000 }));
    if (effects.cancelRunId) await this.runs.cancelRun(effects.cancelRunId);
    if (effects.kick) this.runs.kick(effects.kick);
    await this.runs.refresh(taskId);
  }

  private locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(fn);
    const settled = next.catch(() => undefined);
    this.locks.set(key, settled);
    void settled.then(() => {
      if (this.locks.get(key) === settled) this.locks.delete(key);
    });
    return next;
  }

  /** A rough state of the task's newest step, for mapping typed text to an action. */
  private async lineSummary(taskId: string): Promise<'none' | 'waiting' | 'blocked' | 'done' | 'paused' | 'working' | 'other'> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { resumeAt: true } });
    if (!task) throw new NotFoundException('Task not found');
    const step = await this.prisma.lineStep.findFirst({ where: { taskId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { status: true, kind: true } });
    if (!step) return 'none';
    if (step.status === 'WAITING') return step.kind === 'CHECK' ? 'waiting' : 'blocked';
    if (step.status === 'DONE') return 'done';
    if (step.status === 'ACTIVE') return task.resumeAt ? 'paused' : 'working';
    return 'other';
  }

  private async context(tx: Tx, taskId: string): Promise<Ctx> {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        team: true,
        deviceId: true,
        workDir: true,
        folder: true,
        line: true,
        lineSettings: true,
        createdAt: true,
        brief: { select: { summary: true, answers: true } },
        steps: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, stage: true, status: true, round: true, reason: true, route: true, causedById: true, decidedBy: true, ownerId: true, summary: true, result: true, notes: true, kind: true },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    const line = lineByKey(task.line);
    if (!line) throw new ConflictException('This task is not on a production line.');
    if (!task.deviceId || !task.workDir) throw new ConflictException('This task has no PC.');
    const answers = briefAnswers(task.brief?.answers);
    return {
      task: { id: task.id, title: task.title, team: task.team, deviceId: task.deviceId, workDir: task.workDir, folder: task.folder, createdAt: task.createdAt },
      line,
      settings: readSettings(task.lineSettings, line),
      flags: skipFlags(answers),
      brief: { summary: task.brief?.summary ?? null, answers },
      steps: task.steps.map((s) => ({
        ...s,
        reason: s.reason as StepReason,
        route: (s.route as Route | null) ?? null,
        notes: (s.notes as unknown as FixNote[]) ?? [],
      })),
    };
  }

  private current(ctx: Ctx) {
    return ctx.steps.at(-1);
  }

  private stageOf(ctx: Ctx, key: string): StageDef {
    const stage = ctx.line.stages.find((s) => s.key === key);
    if (!stage) throw new ConflictException(`Unknown stage ${key}.`);
    return stage;
  }

  /** Enters a stage (and skips over switched-off ones): your checks wait for you, work and gates get a run. */
  private async enter(tx: Tx, ctx: Ctx, entry: Entry | null): Promise<Effects> {
    let next = entry;
    while (next) {
      const stage = this.stageOf(ctx, next.stage);
      const skip = next.reason === 'line' ? skipReason(stage, ctx.settings, ctx.flags) : null;
      if (skip) {
        const skipped = await this.createStep(tx, ctx, stage, next, 'SKIPPED', { comment: skip, finishedAt: new Date() });
        next = nextAfterDone(skipped, ctx.steps, ctx.line);
        continue;
      }
      if (stage.kind === 'check') {
        await this.createStep(tx, ctx, stage, next, 'WAITING', {});
        return {};
      }
      const step = await this.createStep(tx, ctx, stage, next, 'ACTIVE', {});
      return this.queueRun(tx, ctx, step, { attempt: 1, retryOf: null, note: null });
    }
    // Past the last stage: nothing left to run.
    return {};
  }

  private async createStep(
    tx: Tx,
    ctx: Ctx,
    stage: StageDef,
    entry: Entry,
    status: 'ACTIVE' | 'WAITING' | 'DONE' | 'SKIPPED',
    extra: { comment?: string; summary?: string; decidedBy?: string; finishedAt?: Date },
  ): Promise<Ctx['steps'][number]> {
    const round = ctx.steps.filter((s) => s.stage === stage.key && s.status !== 'SKIPPED').length + (status === 'SKIPPED' ? 0 : 1);
    const row = await tx.lineStep.create({
      data: {
        taskId: ctx.task.id,
        stage: stage.key,
        kind: KIND[stage.kind],
        ownerId: stage.owner,
        round: Math.max(1, round),
        status,
        reason: entry.reason,
        notes: entry.notes as unknown as Prisma.InputJsonValue,
        causedById: entry.causedById,
        comment: extra.comment ?? null,
        summary: extra.summary ?? null,
        decidedBy: extra.decidedBy ?? null,
        finishedAt: extra.finishedAt ?? null,
      },
      select: { id: true, stage: true, status: true, round: true, reason: true, causedById: true, decidedBy: true, ownerId: true, summary: true, kind: true },
    });
    const step = { ...row, reason: row.reason as StepReason, route: null, result: null, notes: entry.notes };
    ctx.steps.push(step);
    return step;
  }

  private async finishStep(
    tx: Tx,
    stepId: string,
    status: 'DONE' | 'SENT_BACK' | 'WAITING' | 'SKIPPED' | 'CANCELLED',
    data: { summary?: string | null; result?: unknown; score?: number | null; route?: Route | null; comment?: string | null; decidedBy?: string; finishedAt?: Date },
  ) {
    await tx.lineStep.update({
      where: { id: stepId },
      data: {
        status,
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.result !== undefined ? { result: (data.result ?? undefined) as Prisma.InputJsonValue | undefined } : {}),
        ...(data.score !== undefined ? { score: data.score } : {}),
        ...(data.route !== undefined ? { route: (data.route ?? undefined) as unknown as Prisma.InputJsonValue | undefined } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
        ...(data.decidedBy ? { decidedBy: data.decidedBy } : {}),
        ...(data.finishedAt ? { finishedAt: data.finishedAt } : {}),
      },
    });
  }

  /** Queues the run for a work or gate step: the member's persona, the stage's prompt and the files it must leave. */
  private async queueRun(tx: Tx, ctx: Ctx, step: Ctx['steps'][number], opts: { attempt: number; retryOf: string | null; note: string | null }): Promise<Effects> {
    const stage = this.stageOf(ctx, step.stage);
    const member = memberById(stage.owner);
    if (!member) throw new ConflictException(`Unknown member ${stage.owner}.`);
    const folder = ctx.task.folder ?? taskFolderName(ctx.task.title, ctx.task.id, ctx.task.createdAt);
    const round = step.round;
    const v = Math.max(1, ctx.steps.filter((s) => s.stage === 'animate' && s.status !== 'SKIPPED').length);
    const vars = { round, v };
    const folderAbs = absTaskFolder(ctx.task.workDir, folder);

    const history = await tx.run.findMany({
      where: { taskId: ctx.task.id, stepId: { not: null } },
      select: { stage: true, sessionId: true, deviceId: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const resumeSessionId = lineResumeSession({ reason: step.reason, stage, retryOf: opts.retryOf, history, deviceId: ctx.task.deviceId });

    const cause = step.causedById ? ctx.steps.find((s) => s.id === step.causedById) : undefined;
    const previousVerdict = step.reason === 'recheck' && cause?.result ? (cause.result as Verdict) : null;
    const promptInput = {
      line: ctx.line,
      stage,
      member,
      teamLabel: TEAMS.find((t) => t.id === ctx.task.team)?.label ?? ctx.task.team,
      taskTitle: ctx.task.title,
      folderAbs,
      settings: ctx.settings,
      round,
      v,
      briefSummary: ctx.brief.summary ?? '',
      earlier: this.earlierStages(ctx, stage, vars),
      fixes: step.notes,
      previousVerdict,
      rules: this.houseRules(ctx, stage.key),
      requiredFiles: (stage.requiredFiles ?? []).map((f) => fillStagePath(f, vars)),
      triage: step.reason === 'triage',
    };
    // A resumed session already has the brief and its job; it only needs what happened since.
    const prompt =
      resumeSessionId && opts.note
        ? `${opts.note}${step.notes.length ? `\n\nFixes for you:\n${step.notes.map((f) => `- ${f.id} [${f.severity}]: ${f.problem}${f.fix ? ` → ${f.fix}` : ''}`).join('\n')}` : ''}\n\nEnd with the same JSON object your job asked for.`
        : `${opts.note ? `${opts.note}\n\n` : ''}${stagePrompt(promptInput)}`;

    const assets = await this.assets.list(ctx.task.id);
    const role: RunRole & { skillKeys: string[] } = {
      memberId: member.id,
      memberName: member.name,
      stage: stage.key,
      stageLabel: stage.label,
      systemPrompt: stageSystemPrompt(promptInput),
      access: stage.access ?? 'write',
      taskFolder: folder,
      makeDirs: writeScope(stage, round, v).filter((p) => !p.endsWith('.json')),
      files: briefFiles({ title: ctx.task.title, team: ctx.task.team, summary: ctx.brief.summary, answers: ctx.brief.answers, assets, settings: ctx.settings }),
      requiredFiles: promptInput.requiredFiles,
      deliverables: (stage.deliverables ?? []).map((d) => ({ ...d, glob: fillStagePath(d.glob, vars) })),
      ...(stage.saveReply ? { saveReplyTo: fillStagePath(stage.saveReply, vars) } : {}),
      ...(stage.maxTurns ? { maxTurns: stage.maxTurns } : {}),
      ...(stage.timeoutMinutes ? { timeoutMinutes: stage.timeoutMinutes } : {}),
      ...(stage.model ? { model: stage.model } : {}),
      skillKeys: [...memberSkillKeys(member.id), ...(stage.skills ?? [])],
    };

    await tx.run.create({
      data: {
        taskId: ctx.task.id,
        deviceId: ctx.task.deviceId,
        workDir: ctx.task.workDir,
        prompt,
        mode: stage.access === 'plan' ? 'PLAN' : 'EXECUTE',
        agentId: member.id,
        stepId: step.id,
        stage: stage.key,
        attempt: opts.attempt,
        resumeSessionId,
        role: role as unknown as Prisma.InputJsonValue,
        logs: { create: { seq: 0, kind: 'prompt', text: prompt, at: new Date() } },
      },
      select: { id: true },
    });
    return { kick: ctx.task.deviceId };
  }

  /** What earlier stages did, latest round of each, in line order up to this stage. */
  private earlierStages(ctx: Ctx, stage: StageDef, vars: { round: number; v: number }): EarlierStage[] {
    const before = ctx.line.stages.slice(0, ctx.line.stages.indexOf(stage)).filter((s) => s.kind !== 'check');
    return before.flatMap((s) => {
      const last = [...ctx.steps].reverse().find((st) => st.stage === s.key && (st.status === 'DONE' || st.status === 'SENT_BACK'));
      if (!last) return [];
      const files = [...(s.requiredFiles ?? []), ...(s.saveReply ? [s.saveReply] : [])].map((f) => fillStagePath(f, { round: last.round, v: vars.v }));
      return [{ label: s.label, ownerName: memberById(s.owner)?.name ?? s.owner, summary: last.summary ?? '', files }];
    });
  }

  /** Active house rules for this stage: global, the team's, and the clients the brief mentions. */
  private houseRules(ctx: Ctx, stage: string): HouseRule[] {
    const dir = join(getEnv().SKILL_PACKS_DIR, 'house-rules');
    if (!existsSync(dir)) return [];
    const files = [join(dir, 'global.md'), join(dir, `${ctx.task.team}.md`)];
    const clientsDir = join(dir, 'clients');
    if (existsSync(clientsDir)) {
      const text = `${ctx.task.title} ${Object.values(ctx.brief.answers).join(' ')} ${ctx.brief.summary ?? ''}`.toLowerCase();
      for (const file of readdirSync(clientsDir)) {
        if (file.endsWith('.md') && text.includes(file.slice(0, -3).toLowerCase())) files.push(join(clientsDir, file));
      }
    }
    const rules = files.filter(existsSync).flatMap((f) => parseHouseRules(readFileSync(f, 'utf8')));
    return rulesFor(rules, stage);
  }
}
