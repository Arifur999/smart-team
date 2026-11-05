import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { ResourceInfo } from '@smart-team/shared';
import type { FolderConfig } from './config.js';

interface KnownTool {
  name: string;
  /** Fixed command line, never built from input. Run through the shell so Windows finds npm.cmd and friends. */
  versionCommand: string;
  tags: string[];
}

/** Tools the team leaders can route work by. Add one here when a team starts depending on it. */
export const KNOWN_TOOLS: KnownTool[] = [
  { name: 'claude', versionCommand: 'claude --version', tags: ['ai'] },
  { name: 'node', versionCommand: 'node --version', tags: ['code'] },
  { name: 'npm', versionCommand: 'npm --version', tags: ['code'] },
  { name: 'pnpm', versionCommand: 'pnpm --version', tags: ['code'] },
  { name: 'git', versionCommand: 'git --version', tags: ['code'] },
  { name: 'docker', versionCommand: 'docker --version', tags: ['code', 'deploy'] },
  { name: 'python', versionCommand: 'python --version', tags: ['code'] },
  { name: 'ffmpeg', versionCommand: 'ffmpeg -version', tags: ['video', 'audio'] },
];

/** Pulls "1.2.3" out of output like "git version 2.47.1.windows.1" or "v24.15.0". */
export function parseVersion(output: string): string | undefined {
  return output.match(/\d+\.\d+(?:\.\d+)?/)?.[0];
}

function runVersion(tool: KnownTool): Promise<string | null> {
  return new Promise((resolve) => {
    exec(tool.versionCommand, { timeout: 10_000, windowsHide: true }, (error, stdout, stderr) => {
      resolve(error ? null : `${stdout}${stderr}`);
    });
  });
}

export async function detectTools(tools = KNOWN_TOOLS): Promise<ResourceInfo[]> {
  const outputs = await Promise.all(tools.map(runVersion));
  return tools.flatMap((tool, i) => {
    const output = outputs[i];
    if (output == null) return [];
    const version = parseVersion(output);
    return [{ kind: 'TOOL' as const, name: tool.name, tags: tool.tags, ...(version ? { version } : {}) }];
  });
}

/** Folders that do not exist on this PC are skipped with a warning instead of advertised. */
export function folderResources(folders: FolderConfig[], exists: (path: string) => boolean = existsSync): ResourceInfo[] {
  return folders.flatMap((folder) => {
    if (!exists(folder.path)) {
      console.warn(`Skipping folder "${folder.name}": ${folder.path} not found`);
      return [];
    }
    return [{ kind: 'FOLDER' as const, name: folder.name, path: folder.path, tags: folder.tags }];
  });
}
