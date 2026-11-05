import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AGENT_TOKEN: z.string().min(24, 'AGENT_TOKEN must be at least 24 characters'),
  PORT: z.coerce.number().int().positive().default(4000),
  DASHBOARD_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= envSchema.parse(process.env);
  return cached;
}
