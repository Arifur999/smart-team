import { homedir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AGENT_TOKEN: z.string().min(24, 'AGENT_TOKEN must be at least 24 characters'),
  PORT: z.coerce.number().int().positive().default(4000),
  DASHBOARD_ORIGIN: z.string().default('http://localhost:3000'),
  /** The repo's skill-packs folder: manifest.json plus skills written for smart-team. */
  SKILL_PACKS_DIR: z.string().default(resolve(process.cwd(), '../../skill-packs')),
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
