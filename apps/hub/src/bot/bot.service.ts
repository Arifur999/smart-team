import Anthropic from '@anthropic-ai/sdk';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { mentionedTeams, type BotAction, type BotMessageView, type BotRole, type BotSendInput, type BotStatus, type TeamId } from '@smart-team/shared';
import { DevicesService } from '../devices/devices.service.js';
import { getEnv } from '../env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { DashboardGateway } from '../orchestration/dashboard.gateway.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TaskActions } from '../tasks/task-actions.js';
import { TasksService } from '../tasks/tasks.service.js';
import { BOT_SYSTEM_PROMPT, botTurnText, userTurnText } from './bot-prompt.js';
import { botTools } from './bot-tools.js';

/** How many earlier messages Claude sees with each new one. */
const HISTORY = 30;
/** Most tool rounds for one reply, so a confused loop cannot run up the bill. */
const MAX_TOOL_ROUNDS = 10;
/** Starts the reply saved when the Claude API call fails. Such exchanges are left out of the history Claude sees. */
const FAILED_REPLY = 'I could not get an answer from Claude: ';

const MESSAGE_SELECT = { id: true, role: true, text: true, team: true, actions: true, createdAt: true } satisfies Prisma.BotMessageSelect;
type MessageRow = Prisma.BotMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

/**
 * The command bot: a chat with Claude through the Claude API that can read the hub's live data and act on
 * tasks. The API key stays on the hub PC; the browser only talks to the hub.
 */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly devices: DevicesService,
    private readonly taskActions: TaskActions,
    private readonly dashboard: DashboardGateway,
  ) {
    const { ANTHROPIC_API_KEY: key, ANTHROPIC_WORKSPACE_ID: workspace } = getEnv();
    this.client = key ? new Anthropic({ apiKey: key, ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}) }) : null;
  }

  status(): BotStatus {
    return { enabled: this.client !== null, model: getEnv().BOT_MODEL };
  }

  /** The conversation, oldest first. */
  async messages(limit = 100): Promise<BotMessageView[]> {
    const rows = await this.prisma.botMessage.findMany({ select: MESSAGE_SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit });
    return rows.reverse().map(toView);
  }

  async send(input: BotSendInput): Promise<BotMessageView> {
    if (!this.client) throw new ServiceUnavailableException('The command bot is off: add ANTHROPIC_API_KEY to apps/hub/.env and restart the hub.');

    const text = input.text.trim();
    const team = mentionedTeams(text)[0] ?? input.team ?? null;
    const history = await this.history();
    this.dashboard.pushBotMessage(await this.save('YOU', text, team, []));

    const actions: BotAction[] = [];
    let reply: string;
    try {
      reply = await this.ask(this.client, history, userTurnText(text, input.team ?? null), actions);
    } catch (error) {
      this.logger.warn(`Claude API call failed: ${(error as Error).message}`);
      reply = `${FAILED_REPLY}${describeError(error)}`;
    }

    const answer = await this.save('BOT', reply, team, actions);
    this.dashboard.pushBotMessage(answer);
    return answer;
  }

  /** You clicked Confirm or Cancel on one of the bot's action cards. */
  async answer(messageId: string, actionId: string, confirm: boolean): Promise<BotMessageView> {
    const row = await this.prisma.botMessage.findUnique({ where: { id: messageId }, select: MESSAGE_SELECT });
    if (!row) throw new NotFoundException('Message not found');
    const actions = row.actions as unknown as BotAction[];
    const action = actions.find((a) => a.id === actionId);
    if (action?.kind !== 'confirm') throw new NotFoundException('Action not found');
    if (action.answer !== null) throw new ConflictException('That action was already answered.');

    action.answer = confirm ? 'confirmed' : 'declined';
    if (confirm) {
      try {
        if (action.action === 'cancel') await this.taskActions.cancel(action.taskId);
        else if (action.action === 'approve') await this.taskActions.approve(action.taskId);
        else await this.taskActions.instruct(action.taskId, action.text ?? '');
      } catch (error) {
        action.error = (error as Error).message;
      }
    }

    const updated = await this.prisma.botMessage.update({ where: { id: messageId }, data: { actions: actions as unknown as Prisma.InputJsonValue }, select: MESSAGE_SELECT });
    const view = toView(updated);
    this.dashboard.pushBotMessage(view);
    return view;
  }

  /** Runs Claude with the bot's tools until it has a final answer. */
  private async ask(client: Anthropic, history: BetaMessageParam[], userText: string, actions: BotAction[]): Promise<string> {
    const env = getEnv();
    const final = await client.beta.messages.toolRunner({
      model: env.BOT_MODEL,
      max_tokens: 16000,
      system: [{ type: 'text', text: BOT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: env.BOT_EFFORT },
      // If a safety check declines a turn, the API retries it on a suitable fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      tools: botTools({ prisma: this.prisma, tasks: this.tasks, devices: this.devices, taskActions: this.taskActions }, actions),
      messages: [...history, { role: 'user', content: userText }],
      max_iterations: MAX_TOOL_ROUNDS,
      thread: false,
    });

    if (final.stop_reason === 'refusal') return 'I can’t help with that request.';
    const text = final.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('\n')
      .trim();
    if (final.stop_reason === 'tool_use') return text || 'I stopped after too many steps. Try asking in smaller parts.';
    return text || (actions.length > 0 ? 'Done.' : 'I have no answer for that.');
  }

  /** Earlier messages as Claude turns: plain text, starting with one of yours, without exchanges where the API failed. */
  private async history(): Promise<BetaMessageParam[]> {
    const all = await this.messages(HISTORY);
    const rows = all.filter((r, i) => {
      const reply = r.role === 'YOU' ? all[i + 1] : r;
      return !(reply?.role === 'BOT' && reply.text.startsWith(FAILED_REPLY));
    });
    const first = rows.findIndex((r) => r.role === 'YOU');
    if (first < 0) return [];
    return rows.slice(first).map((r) =>
      r.role === 'YOU' ? { role: 'user' as const, content: r.text } : { role: 'assistant' as const, content: botTurnText(r.text, r.actions) || '(no reply)' },
    );
  }

  private async save(role: BotRole, text: string, team: TeamId | null, actions: BotAction[]): Promise<BotMessageView> {
    const row = await this.prisma.botMessage.create({
      data: { role, text, team, actions: actions as unknown as Prisma.InputJsonValue },
      select: MESSAGE_SELECT,
    });
    return toView(row);
  }
}

function toView(row: MessageRow): BotMessageView {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    team: row.team,
    actions: row.actions as unknown as BotAction[],
    at: row.createdAt.toISOString(),
  };
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'the API key was rejected. Check ANTHROPIC_API_KEY in apps/hub/.env.';
  if (error instanceof Anthropic.PermissionDeniedError) return 'the API key may not use this model. Check BOT_MODEL in apps/hub/.env.';
  if (error instanceof Anthropic.RateLimitError) return 'too many requests right now. Try again in a minute.';
  if (error instanceof Anthropic.APIConnectionError) return 'the hub PC could not reach the Claude API. Check its internet connection.';
  if (error instanceof Anthropic.BadRequestError && /workspace/i.test(error.message)) {
    return 'this API key is not tied to a workspace. Add ANTHROPIC_WORKSPACE_ID (from the Claude Console, Settings → Workspaces) to apps/hub/.env and restart the hub.';
  }
  if (error instanceof Anthropic.APIError) return `the API returned ${error.status ?? 'an error'}: ${error.message}`;
  return (error as Error).message;
}
