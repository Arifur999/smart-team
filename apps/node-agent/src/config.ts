import { existsSync, readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { z } from 'zod';

const envSchema = z.object({
  HUB_URL: z.url(),
  AGENT_TOKEN: z.string().min(24, 'AGENT_TOKEN must match the hub and be at least 24 characters'),
  DEVICE_NAME: z.string().trim().max(60).optional(),
});

const folderSchema = z.object({
  name: z.string().min(1).max(120),
  path: z.string().min(1).max(500),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
});

const fileSchema = z.object({
  folders: z.array(folderSchema).max(100).default([]),
});

export type FolderConfig = z.infer<typeof folderSchema>;

export interface AgentConfig {
  hubUrl: string;
  token: string;
  deviceName: string;
  folders: FolderConfig[];
}

export function loadConfig(configPath = 'agent.config.json'): AgentConfig {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file: rely on the real environment.
  }

  const env = envSchema.parse(process.env);
  const file = existsSync(configPath) ? fileSchema.parse(JSON.parse(readFileSync(configPath, 'utf8'))) : { folders: [] };

  return {
    hubUrl: env.HUB_URL,
    token: env.AGENT_TOKEN,
    deviceName: env.DEVICE_NAME || hostname(),
    folders: file.folders,
  };
}
