// Runs Postgres on this PC without Docker, for the hub. User, password, port and database come from
// DATABASE_URL in apps/hub/.env; the data stays in PG_DATA_DIR (default: data/postgres at the repo root).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const hubDir = resolve(fileURLToPath(import.meta.url), '../..');
try {
  process.loadEnvFile(join(hubDir, '.env'));
} catch {
  // No .env file: rely on the real environment.
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in apps/hub/.env');
  process.exit(1);
}
const url = new URL(process.env.DATABASE_URL);
const dataDir = resolve(process.env.PG_DATA_DIR ?? join(hubDir, '../../data/postgres'));
const database = url.pathname.slice(1);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5432),
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

// On Windows embedded-postgres stops Postgres by killing its main process, which leaves the worker processes
// holding shared memory, and the next start fails. pg_ctl shuts every process down cleanly instead.
const binaries = process.platform === 'win32' ? await import('@embedded-postgres/windows-x64') : null;
const pgCtl = binaries ? (...args) => spawnSync(binaries.pg_ctl, [...args, '-D', dataDir], { stdio: 'inherit' }).status : null;

const firstRun = !existsSync(join(dataDir, 'PG_VERSION'));
if (firstRun) await pg.initialise();
else if (binaries) {
  // Left over from a crash or a forced close: a Postgres still running on this data folder is stopped first, and
  // workers whose main process is gone (they still hold shared memory) are closed. Only this repo's Postgres is touched.
  if (pgCtl('status') === 0) pgCtl('stop', '-m', 'fast', '-w');
  else closeLeftoverWorkers(binaries.postgres);
}
try {
  await pg.start();
} catch {
  // embedded-postgres rejects without a reason; Postgres' own lines above say why.
  console.error(`postgres could not start on port ${url.port}. Is another Postgres using that port?`);
  process.exit(1);
}
try {
  await pg.createDatabase(database);
} catch {
  // It already exists.
}
console.log(`postgres ready on port ${url.port} (data: ${dataDir})`);

const stop = async () => {
  if (pgCtl) pgCtl('stop', '-m', 'fast', '-w');
  else await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
// Windows has no real signals between processes: scripts/serve.mjs asks over IPC so Postgres shuts down cleanly.
process.on('message', (message) => message === 'stop' && void stop());
// Keep the process alive while Postgres runs.
setInterval(() => {}, 1 << 30);

function closeLeftoverWorkers(postgresExe) {
  const script = `Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | Where-Object { $_.ExecutablePath -eq '${postgresExe}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
  spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore' });
}
