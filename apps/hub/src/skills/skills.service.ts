import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { skillRoleKey, type RoleSkills, type RunMode, type SkillBundle, type SkillRef, type TeamId } from '@smart-team/shared';
import { getEnv } from '../env.js';

/** Files and folders never shipped with a skill. */
const SKIP = new Set(['node_modules', '.git', '.DS_Store', 'Thumbs.db']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface FoundSkill extends SkillRef {
  dir: string;
  files: string[];
}

interface Manifest {
  roles: Record<string, string[]>;
}

/**
 * Knows every skill on the hub PC and which roles get which. Skills come from the repo's
 * skill-packs/skills first, then from SKILL_DIRS. A skill's version is a hash of its files, so editing
 * a skill on the hub makes every agent download the new copy on its next run.
 */
@Injectable()
export class SkillsService implements OnModuleInit {
  private readonly logger = new Logger(SkillsService.name);
  private skills = new Map<string, FoundSkill>();
  private manifest: Manifest = { roles: {} };

  onModuleInit() {
    this.reload();
  }

  /** Re-reads the manifest and all skill folders. Cheap enough to call before each run. */
  reload() {
    const env = getEnv();
    this.manifest = readManifest(join(env.SKILL_PACKS_DIR, 'manifest.json'));
    const dirs = [join(env.SKILL_PACKS_DIR, 'skills'), ...env.SKILL_DIRS];

    const found = new Map<string, FoundSkill>();
    for (const root of dirs) {
      if (!existsSync(root)) continue;
      for (const name of readdirSync(root)) {
        if (found.has(name)) continue; // the first source wins
        const skill = readSkill(join(root, name), name);
        if (skill) found.set(name, skill);
      }
    }
    this.skills = found;

    const missing = this.roleSkills().flatMap((r) => r.skills.filter((s) => !s.version).map((s) => `${r.role}: ${s.name}`));
    this.logger.log(`${found.size} skills found${missing.length ? `; missing ${missing.join(', ')}` : ''}`);
  }

  /** The skills a run loads: plans get the planner's skills plus the team's worker skills, work gets the worker skills. */
  forRun(team: TeamId, mode: RunMode): SkillRef[] {
    const keys = mode === 'PLAN' ? [skillRoleKey(null, 'planner'), skillRoleKey(team, 'worker')] : [skillRoleKey(team, 'worker')];
    const names = new Set(keys.flatMap((k) => this.expand(this.manifest.roles[k] ?? [])));
    return [...names].flatMap((n) => {
      const s = this.skills.get(n);
      return s ? [{ name: s.name, version: s.version }] : [];
    });
  }

  /** Every role in the manifest with its skills, marking the ones the hub cannot find. */
  roleSkills(): RoleSkills[] {
    return Object.entries(this.manifest.roles).map(([role, patterns]) => ({
      role,
      skills: patterns.flatMap((p) => {
        const names = this.expand([p]);
        if (names.length === 0) return [{ name: p, version: null }];
        return names.map((n) => ({ name: n, version: this.skills.get(n)?.version ?? null }));
      }),
    }));
  }

  bundle(name: string, version: string): SkillBundle {
    const skill = this.skills.get(name);
    if (!skill) throw new NotFoundException(`Skill ${name} not found on the hub`);
    if (skill.version !== version) throw new NotFoundException(`Skill ${name} is at version ${skill.version}, not ${version}`);
    return {
      name,
      version,
      files: skill.files.map((path) => ({
        path: path.split(sep).join('/'),
        base64: readFileSync(join(skill.dir, path)).toString('base64'),
      })),
    };
  }

  private expand(patterns: string[]): string[] {
    return patterns.flatMap((p) =>
      p.endsWith('*') ? [...this.skills.keys()].filter((n) => n.startsWith(p.slice(0, -1))).sort() : this.skills.has(p) ? [p] : [],
    );
  }
}

function readManifest(path: string): Manifest {
  if (!existsSync(path)) return { roles: {} };
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<Manifest>;
  return { roles: raw.roles ?? {} };
}

/** A folder is a skill when it has a SKILL.md at its root. Broken links and unreadable folders are skipped. */
export function readSkill(dir: string, name: string): FoundSkill | null {
  try {
    if (!statSync(dir).isDirectory() || !existsSync(join(dir, 'SKILL.md'))) return null;
  } catch {
    return null;
  }

  const files = listFiles(dir).sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.split(sep).join('/'));
    hash.update('\0');
    hash.update(readFileSync(join(dir, file)));
  }
  return { name, version: hash.digest('hex').slice(0, 12), dir, files };
}

function listFiles(root: string, dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(root, full);
    if (!entry.isFile() || statSync(full).size > MAX_FILE_BYTES) return [];
    return [relative(root, full)];
  });
}
