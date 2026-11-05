import { homedir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AGENT_TOKEN: z.string().min(24, 'AGENT_TOKEN must be at least 24 characters'),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Pages allowed to call the hub from a browser: "private" (this PC, LAN, Tailscale) or a comma-separated list. */
  DASHBOARD_ORIGIN: z.string().default('private'),
  /** The repo's skill-packs folder: manifest.json plus skills written for smart-team. */
  SKILL_PACKS_DIR: z.string().default(resolve(process.cwd(), '../../skill-packs')),
  /** Where files uploaded through the intake chat are stored on the hub PC. */
  UPLOAD_DIR: z.string().default(resolve(process.cwd(), 'uploads')),
  /** Largest single upload, in megabytes. Raw footage can be big. */
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(4096),
  /** Claude API key for the command bot. Without it the bot is switched off; agents never use it. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  /** Needed when the key is not scoped to one workspace: the workspace id from the Claude Console (Settings → Workspaces). */
  ANTHROPIC_WORKSPACE_ID: z.string().min(1).optional(),
  /** Model the command bot talks with. */
  BOT_MODEL: z.string().default('claude-opus-5-5'),
  /** How hard the bot thinks before answering: low is quickest and cheapest, high the most careful. */
  BOT_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('medium'),
  /** More folders of Claude Code skills on the hub PC, separated by the OS path delimiter (";" on Windows). */
  SKILL_DIRS: z
    .string()
    .default(join(homedir(), '.claude', 'skills'))
    .transform((v) => v.split(delimiter).filter(Boolean)),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= envSchema.parse(process.env);
  return cached;
}
