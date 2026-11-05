// Runs smart-team on the hub PC in production mode: Postgres, the hub, the dashboard and this PC's node agent.
// Each one starts again by itself if it stops. Output goes to logs/<name>.log. Build first: npm run build:all
//
//   node scripts/serve.mjs              start everything
//   node scripts/serve.mjs --no-agent   start without this PC's node agent
//   node scripts/serve.mjs --agent-only on the other PCs: only the node agent (set up by scripts/join.ps1)
//   node scripts/serve.mjs --stop       stop a running copy (also when it runs hidden at sign-in)
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const hubDir = join(root, 'apps/hub');
const dashboardDir = join(root, 'apps/dashboard');
const agentDir = join(root, 'apps/node-agent');
const logDir = join(root, 'logs');
const pidFile = join(logDir, 'serve.pid');
const stopFile = join(logDir, 'serve.stop');
const DASHBOARD_PORT = '3000';
/** A log file bigger than this is moved to <name>.old.log when its service starts. */
const MAX_LOG_BYTES = 10 * 1024 * 1024;

mkdirSync(logDir, { recursive: true });
const args = process.argv.slice(2);
if (args.includes('--stop')) await stopRunningCopy();
else await serve({ withAgent: !args.includes('--no-agent'), agentOnly: args.includes('--agent-only') });

async function serve({ withAgent, agentOnly }) {
  const running = readPid();
  if (running) fail(`smart-team is already running (pid ${running}). Stop it with: npm run serve:stop`);
  const needed = agentOnly ? [join(agentDir, 'dist')] : [join(hubDir, 'dist'), join(dashboardDir, '.next'), ...(withAgent ? [join(agentDir, 'dist')] : [])];
  for (const dir of needed) {
    if (!existsSync(dir)) fail(`${dir} is missing. Build first: ${agentOnly ? 'run scripts/join.ps1 again' : 'npm run build:all'}`);
  }
  if ((withAgent || agentOnly) && !existsSync(join(agentDir, 'agent.config.json'))) {
    if (agentOnly) fail('apps/node-agent/agent.config.json is missing. Run scripts/join.ps1 first.');
    console.log('apps/node-agent/agent.config.json is missing, so this PC will not run agents. See the README.');
    withAgent = false;
  }
  writeFileSync(pidFile, String(process.pid));
  rmSync(stopFile, { force: true });

  const agent = { name: 'agent', cwd: agentDir, args: ['dist/main.js'] };
  const hubEnv = agentOnly ? {} : parseEnv(readFileSync(join(hubDir, '.env'), 'utf8'));
  const dbPort = agentOnly ? 0 : Number(new URL(hubEnv.DATABASE_URL).port || 5432);
  const services = agentOnly
    ? [agent]
    : [
        { name: 'hub', cwd: hubDir, args: ['dist/main.js'] },
        {
          name: 'dashboard',
          cwd: dashboardDir,
          args: [createRequire(join(dashboardDir, 'package.json')).resolve('next/dist/bin/next'), 'start', '-H', '0.0.0.0', '-p', DASHBOARD_PORT],
        },
        ...(withAgent ? [agent] : []),
      ];

  let stopping = false;
  let postgresReady = false;
  const children = new Map();

  const start = (service, delay = 5000) => {
    const log = openLog(service.name);
    const child = spawn(process.execPath, service.args, { cwd: service.cwd, stdio: ['ignore', 'pipe', 'pipe', ...(service.ipc ? ['ipc'] : [])] });
    const startedAt = Date.now();
    children.set(service.name, child);
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        log.write(chunk);
        if (service.name === 'postgres' && String(chunk).includes('postgres ready')) postgresReady = true;
        for (const line of String(chunk).split(/\r?\n/)) if (line) console.log(`[${service.name}] ${line}`);
      });
    }
    child.on('exit', (code) => {
      log.end();
      children.delete(service.name);
      if (stopping) return;
      // A service that keeps crashing right away waits longer each time, up to a minute.
      const next = Date.now() - startedAt > 60_000 ? 5000 : Math.min(delay * 2, 60_000);
      console.log(`[${service.name}] stopped (code ${code}); starting again in ${next / 1000}s`);
      setTimeout(() => !stopping && start(service, next), next);
    });
  };

  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log('stopping smart-team');
    const postgres = children.get('postgres');
    for (const [name, child] of children) if (name !== 'postgres') killTree(child.pid);
    await waitUntil(() => children.size <= (postgres ? 1 : 0), 15_000);
    if (postgres?.connected) postgres.send('stop');
    if (!(await waitUntil(() => children.size === 0, 30_000)) && postgres) killTree(postgres.pid);
    rmSync(pidFile, { force: true });
    rmSync(stopFile, { force: true });
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  setInterval(() => existsSync(stopFile) && void shutdown(), 1000);

  if (agentOnly) {
    start(agent);
    return console.log('smart-team agent is starting; this PC shows on the dashboard within a few seconds');
  }

  start({ name: 'postgres', cwd: hubDir, args: ['scripts/postgres.mjs'], ipc: true });
  if (!(await waitUntil(() => postgresReady, 90_000))) console.log(`postgres was not ready on port ${dbPort} within 90s; see logs/postgres.log`);

  // New database changes from git pulls; harmless when there are none.
  const migrate = spawnSync(process.execPath, [createRequire(join(hubDir, 'package.json')).resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: hubDir,
    encoding: 'utf8',
  });
  openLog('migrate').end(`${migrate.stdout ?? ''}${migrate.stderr ?? ''}`);
  console.log(migrate.status === 0 ? 'database is up to date' : 'database migration failed; see logs/migrate.log');

  for (const service of services) start(service);
  console.log(`smart-team is starting: dashboard on port ${DASHBOARD_PORT}, hub on port ${hubEnv.PORT ?? 4000}`);
}

async function stopRunningCopy() {
  const pid = readPid();
  if (!pid) return console.log('smart-team is not running');
  writeFileSync(stopFile, '');
  if (await waitUntil(() => !alive(pid), 60_000)) return console.log('smart-team stopped');
  killTree(pid);
  rmSync(pidFile, { force: true });
  rmSync(stopFile, { force: true });
  console.log('smart-team did not stop in time and was closed by force');
}

function openLog(name) {
  const file = join(logDir, `${name}.log`);
  if (existsSync(file) && statSync(file).size > MAX_LOG_BYTES) renameSync(file, join(logDir, `${name}.old.log`));
  const log = createWriteStream(file, { flags: 'a' });
  log.write(`\n--- ${new Date().toISOString()} start\n`);
  return log;
}

function readPid() {
  if (!existsSync(pidFile)) return null;
  const pid = Number(readFileSync(pidFile, 'utf8'));
  return pid && alive(pid) ? pid : null;
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Closes a process and everything it started (Next.js and Claude Code start their own children). */
function killTree(pid) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else process.kill(pid, 'SIGTERM');
}

async function waitUntil(check, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
