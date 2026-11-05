import { existsSync, readFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  HUB_URL: z.url(),
  AGENT_TOKEN: z.string().min(24, 'AGENT_TOKEN must match the hub and be at least 24 characters'),
  DEVICE_NAME: z.string().trim().max(60).optional(),
  /** Where downloaded skills and per-run plugin folders live. Outside every project on purpose. */
  CACHE_DIR: z.string().default(join(homedir(), '.smart-team', 'cache')),
});

const folderSchema = z.object({
  name: z.string().min(1).max(120),
  path: z.string().min(1).max(500),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
});

const claudeSchema = z.object({
  /** The Claude Code executable. "claude" works when it is on PATH. */
  command: z.string().min(1).default('claude'),
  /** Permission mode for approved work. Plans always run in "plan" mode, which cannot change files. */
  permissionMode: z.enum(['acceptEdits', 'default', 'bypassPermissions']).default('acceptEdits'),
  /** Extra tools approved work may use without asking, e.g. "Bash(npm test:*)". */
  allowedTools: z.array(z.string().min(1)).max(100).default([]),
  maxTurns: z.number().int().positive().max(500).optional(),
});

const fileSchema = z.object({
  folders: z.array(folderSchema).max(100).default([]),
  claude: claudeSchema.prefault({}),
});

export type FolderConfig = z.infer<typeof folderSchema>;
export type ClaudeConfig = z.infer<typeof claudeSchema>;

export interface AgentConfig {
  hubUrl: string;
  token: string;
  deviceName: string;
  cacheDir: string;
  folders: FolderConfig[];
  claude: ClaudeConfig;
}

export function loadConfig(configPath = 'agent.config.json'): AgentConfig {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file: rely on the real environment.
  }

  const env = envSchema.parse(process.env);
  const file = fileSchema.parse(existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {});

  return {
    hubUrl: env.HUB_URL,
    token: env.AGENT_TOKEN,
    deviceName: env.DEVICE_NAME || hostname(),
    cacheDir: env.CACHE_DIR,
    folders: file.folders,
    claude: file.claude,
  };
}
