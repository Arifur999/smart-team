import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { INTAKE_AGENT_NAME, INTAKE_TEMPLATES, PLAN_AGENT_NAME, type IntakeField, type IntakeView } from '@smart-team/shared';
import type { IntakePhase } from '../generated/prisma/client.js';
import { RunDispatcher } from '../orchestration/run-dispatcher.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { AssetsService } from './assets.service.js';
import { fallbackSummary, parseReview, planPrompt, reviewPrompt, type BriefState } from './brief-prompts.js';

/** Brief checks before the intake agent stops asking and hands you the summary to confirm. */
const MAX_REVIEW_ROUNDS = 3;
const CLARIFICATIONS = '_clarifications';
const SKIP_WORDS = new Set(['skip', 'none', 'no', 'n/a', '-']);
const NEXT_WORDS = new Set(['next', 'done', 'continue', 'that is all', "that's all"]);
/** Typed when the brief is ready, these confirm it instead of being added to it. */
const CONFIRM_WORDS = new Set(['confirm', 'confirmed', 'ok', 'okay', 'yes', 'go', 'go ahead', 'start', 'start planning', 'approve', 'approved', 'looks good', 'lgtm', 'done', 'proceed']);

/**
 * The intake agent's conversation: one template question at a time, then a brief check by Claude,
 * follow-up questions if needed, and a summary you confirm. Confirming queues the plan.
 */
@Injectable()
export class IntakeService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly assets: AssetsService,
    private readonly runs: RunDispatcher,
  ) {}

  onModuleInit() {
    // The brief check is a run like any other; pick its result up when it ends.
    this.runs.onRunEnded(({ taskId }) => this.onCheckEnded(taskId));
  }

  /** Greets you and takes the description from the new-task form as the answer to the first question. */
  async start(taskId: string, description: string) {
    await this.say(taskId, 'FRIDAY', `Hi, I'm ${INTAKE_AGENT_NAME}. I'll collect what the team needs before anything is planned.`);
    const { fields } = await this.load(taskId);
    const first = fields[0]!;
    await this.say(taskId, 'FRIDAY', first.question);
    await this.say(taskId, 'YOU', description);
    await this.saveAnswer(taskId, first.id, description);
    await this.askNext(taskId);
  }

  async view(taskId: string): Promise<IntakeView> {
    const { brief, fields } = await this.load(taskId);
    const [messages, assets] = await Promise.all([
      this.prisma.intakeMessage.findMany({ where: { taskId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.assets.list(taskId),
    ]);
    const answers = answersOf(brief.answers);
    return {
      taskId,
      phase: brief.phase,
      fields: fields.map((f) => ({ ...f, answer: answers[f.id] ?? null, skipped: brief.skipped.includes(f.id), assets: assets.filter((a) => a.fieldId === f.id) })),
      currentFieldId: brief.phase === 'ASKING' ? brief.currentFieldId : null,
      messages: messages.map((m) => ({ id: m.id, from: m.speaker, text: m.text, at: m.createdAt.toISOString() })),
      summary: brief.summary,
    };
  }

  /** A line you typed in the brief chat. What it means depends on where the intake stands. */
  async answer(taskId: string, text: string) {
    const { brief, fields } = await this.load(taskId);
    const said = text.trim();
    if (brief.phase === 'REVIEWING') throw new ConflictException(`${INTAKE_AGENT_NAME} is checking the brief. Wait a moment.`);
    if (brief.phase === 'LOCKED') throw new ConflictException('The brief is already confirmed.');
    await this.say(taskId, 'YOU', said);

    if (brief.phase === 'ASKING') {
      const field = fields.find((f) => f.id === brief.currentFieldId);
      if (!field) return this.askNext(taskId);
      const word = said.toLowerCase();
      const hasFiles = (await this.assets.list(taskId)).some((a) => a.fieldId === field.id);

      if (SKIP_WORDS.has(word) && !field.required) {
        await this.prisma.brief.update({ where: { taskId }, data: { skipped: { push: field.id } } });
      } else if (NEXT_WORDS.has(word) && field.kind === 'files' && hasFiles) {
        // Files are in; nothing to type.
      } else if ((SKIP_WORDS.has(word) || NEXT_WORDS.has(word)) && field.required && !hasFiles) {
        return this.say(taskId, 'FRIDAY', `The team needs this one: ${field.question}`);
      } else {
        await this.saveAnswer(taskId, field.id, said);
      }
      return this.askNext(taskId);
    }

    if (brief.phase === 'READY' && CONFIRM_WORDS.has(said.toLowerCase().replace(/[.!\s]+$/, ''))) return this.confirm(taskId);

    // CLARIFYING, or READY with changes: your words go to the brief and it is checked again.
    await this.addClarification(taskId, said);
    return this.check(taskId);
  }

  /** Called after a file is attached: acknowledges it and keeps asking about the same field. */
  async fileAdded(taskId: string, fieldId: string, name: string) {
    const { fields } = await this.load(taskId);
    const field = fields.find((f) => f.id === fieldId);
    await this.say(taskId, 'FRIDAY', `Got ${name}${field ? ` for ${field.label}` : ''}. Add more, or type "next" to continue.`);
    await this.runs.refresh(taskId);
  }

  /** You confirmed the summary: lock the brief and queue the plan. */
  async confirm(taskId: string) {
    const { brief, task } = await this.load(taskId);
    if (brief.phase !== 'READY' || !brief.summary) throw new ConflictException('The brief is not ready to confirm yet.');
    await this.setPhase(taskId, 'LOCKED', { lockedAt: new Date() });
    await this.say(taskId, 'FRIDAY', `Brief locked. ${PLAN_AGENT_NAME} is planning it now.`);
    await this.tasks.queueRun(taskId, 'PLAN', planPrompt(task.team, brief.summary));
    await this.runs.queued(taskId);
  }

  /** Cancels a task still in intake: stops a running brief check and closes the brief with a cancelled run. */
  async dismiss(taskId: string) {
    const { brief } = await this.load(taskId);
    if (brief.phase === 'LOCKED') return;
    const active = await this.prisma.run.findFirst({ where: { taskId, status: { in: ['QUEUED', 'RUNNING'] } }, select: { id: true } });
    if (active) await this.runs.cancel(taskId);
    await this.setPhase(taskId, 'LOCKED', { currentFieldId: null });
    if (!active) {
      // A cancelled run records the outcome, so the task shows as Cancelled like any other.
      await this.tasks.queueRun(taskId, 'INTAKE', 'Cancelled during intake.');
      const run = await this.tasks.newestRun(taskId);
      await this.tasks.finish(run.id, { status: 'CANCELLED', outcome: 'Cancelled during intake.' });
    }
    await this.say(taskId, 'FRIDAY', 'Cancelled. Nothing was planned or changed.');
    await this.runs.refresh(taskId);
  }

  private async askNext(taskId: string) {
    const { brief, fields } = await this.load(taskId);
    const answers = answersOf(brief.answers);
    const files = await this.assets.list(taskId);
    const next = fields.find(
      (f) => !answers[f.id]?.trim() && !brief.skipped.includes(f.id) && !files.some((a) => a.fieldId === f.id),
    );

    if (!next) return this.check(taskId);

    await this.prisma.brief.update({ where: { taskId }, data: { currentFieldId: next.id } });
    await this.say(taskId, 'FRIDAY', questionText(next));
    await this.runs.refresh(taskId);
  }

  /** Hands the brief to Claude (read-only) to look for gaps. */
  private async check(taskId: string) {
    const state = await this.state(taskId);
    await this.setPhase(taskId, 'REVIEWING', { currentFieldId: null, reviewRounds: { increment: 1 } });
    await this.say(taskId, 'FRIDAY', 'Thanks! Let me check the brief for anything unclear…');
    await this.tasks.queueRun(taskId, 'INTAKE', reviewPrompt(state));
    await this.runs.queued(taskId);
  }

  private async onCheckEnded(taskId: string) {
    const brief = await this.prisma.brief.findUnique({ where: { taskId } });
    if (brief?.phase !== 'REVIEWING') return;
    const run = await this.tasks.newestRun(taskId);
    if (run.mode !== 'INTAKE' || run.status === 'QUEUED' || run.status === 'RUNNING') return;

    const state = await this.state(taskId);
    const review = run.status === 'SUCCEEDED' ? parseReview(run.outcome) : null;

    if (!review) {
      const why = run.status === 'SUCCEEDED' ? 'its answer was not in the expected format' : (run.outcome ?? 'the run did not finish');
      await this.setPhase(taskId, 'READY', { summary: fallbackSummary(state) });
      await this.say(taskId, 'FRIDAY', `I could not check the brief automatically (${why}). Here it is as you gave it: confirm it, or tell me what to change.`);
    } else if (review.questions.length > 0 && brief.reviewRounds < MAX_REVIEW_ROUNDS) {
      await this.setPhase(taskId, 'CLARIFYING', { summary: review.summary });
      await this.say(taskId, 'FRIDAY', ['A few things to clear up:', ...review.questions.map((q, i) => `${i + 1}. ${q}`)].join('\n'));
    } else {
      await this.setPhase(taskId, 'READY', { summary: review.summary ?? fallbackSummary(state) });
      await this.say(taskId, 'FRIDAY', 'The brief is ready. Please confirm it, or tell me what to change.');
    }
    await this.runs.refresh(taskId);
  }

  private async load(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { team: true, title: true, brief: true } });
    if (!task?.brief) throw new NotFoundException('This task has no brief.');
    return { task, brief: task.brief, fields: INTAKE_TEMPLATES[task.team] };
  }

  private async state(taskId: string): Promise<BriefState> {
    const { task, brief, fields } = await this.load(taskId);
    const answers = answersOf(brief.answers);
    return {
      team: task.team,
      title: task.title,
      fields,
      answers,
      skipped: brief.skipped,
      assets: await this.assets.list(taskId),
      clarifications: (answers[CLARIFICATIONS] ?? '').split('\n').filter(Boolean),
    };
  }

  private async saveAnswer(taskId: string, fieldId: string, text: string) {
    const { brief } = await this.load(taskId);
    await this.prisma.brief.update({ where: { taskId }, data: { answers: { ...answersOf(brief.answers), [fieldId]: text } } });
  }

  private async addClarification(taskId: string, text: string) {
    const { brief } = await this.load(taskId);
    const answers = answersOf(brief.answers);
    const lines = [answers[CLARIFICATIONS], text.replace(/\s*\n\s*/g, ' ')].filter(Boolean).join('\n');
    await this.prisma.brief.update({ where: { taskId }, data: { answers: { ...answers, [CLARIFICATIONS]: lines } } });
  }

  private async setPhase(taskId: string, phase: IntakePhase, extra: Record<string, unknown> = {}) {
    await this.prisma.brief.update({ where: { taskId }, data: { phase, ...extra } });
  }

  private async say(taskId: string, speaker: 'FRIDAY' | 'YOU', text: string) {
    await this.prisma.intakeMessage.create({ data: { taskId, speaker, text } });
  }
}

function questionText(field: IntakeField): string {
  const extras = [
    field.kind === 'files' ? 'You can upload files, point to a folder on one of your PCs, or paste a link.' : null,
    field.required ? null : 'Optional: type "skip" to move on.',
  ].filter(Boolean);
  return [field.question, ...extras].join(' ');
}

function answersOf(json: unknown): Record<string, string> {
  return json && typeof json === 'object' ? (json as Record<string, string>) : {};
}
