import { hostname, platform } from 'node:os';
import {
  AGENT_NAMESPACE,
  AgentEvents,
  HEARTBEAT_MS,
  type RegisterPayload,
  type RunCancelPayload,
  type RunFinishedPayload,
  type RunLogPayload,
  type RunStartPayload,
} from '@smart-team/shared';
import { io } from 'socket.io-client';
import { ClaudeRunner } from './claude-runner.js';
import { loadConfig } from './config.js';
import { detectTools, folderResources } from './resources.js';
import { AssetCache, type PreparedAssets } from './asset-cache.js';
import { SkillCache } from './skill-cache.js';
import { DeliverableUploader } from './deliverable-uploader.js';
import { missingFiles, prepareTaskFolder, saveReply } from './stage-files.js';

/** 0.4.0: runs production-line stages (role, task folder, required files). */
const AGENT_VERSION = '0.4.0';

const config = loadConfig();
const runner = new ClaudeRunner(config.claude, () => config.folders.map((f) => f.path));
const skills = new SkillCache(config.hubUrl, config.token, config.cacheDir);
/** This PC's id on the hub, from the register reply; brief folders on this PC are opened to Claude directly. */
let deviceId: string | null = null;
const assets = new AssetCache(config.hubUrl, config.token, config.cacheDir, () => deviceId, () => config.folders.map((f) => f.path));

async function buildPayload(): Promise<RegisterPayload> {
  const tools = await detectTools();
  return {
    name: config.deviceName,
    hostname: hostname(),
    platform: platform(),
    agentVersion: AGENT_VERSION,
    resources: [...tools, ...folderResources(config.folders)],
  };
}

const socket = io(new URL(AGENT_NAMESPACE, config.hubUrl).toString(), {
  auth: { token: config.token },
  reconnectionDelayMax: 10_000,
});

let heartbeat: NodeJS.Timeout | undefined;

socket.on('connect', async () => {
  // Re-scan on every connect so a newly installed tool or added folder shows up after a reconnect.
  const payload = await buildPayload();
  socket.emit(AgentEvents.register, payload, (reply: { deviceId?: string } | undefined) => {
    deviceId = reply?.deviceId ?? null;
    console.log(`Registered as "${payload.name}" with ${payload.resources.length} resources`);
  });

  clearInterval(heartbeat);
  heartbeat = setInterval(() => socket.emit(AgentEvents.heartbeat), HEARTBEAT_MS);
});

/** A run whose skills or files are still downloading; Claude has not started yet, so cancelling just marks it. */
let preparing: { runId: string; cancelled: boolean } | undefined;
/** A line run whose Claude part is done and whose files are uploading; cancelling stops the upload. */
let collecting: { runId: string; controller: AbortController } | undefined;
const uploader = new DeliverableUploader(config.hubUrl, config.token, () => deviceId);

socket.on(AgentEvents.runStart, async (run: RunStartPayload) => {
  console.log(`Starting ${run.mode.toLowerCase()} run ${run.runId} in ${run.workDir}`);
  const finish = (result: Omit<RunFinishedPayload, 'runId'>) => {
    skills.removePlugin(run.runId);
    console.log(`Run ${run.runId} ended: ${result.status}`);
    socket.emit(AgentEvents.runFinished, { runId: run.runId, ...result } satisfies RunFinishedPayload);
  };

  preparing = { runId: run.runId, cancelled: false };
  let pluginDir: string | null = null;
  let files: PreparedAssets = { addDirs: [], promptSuffix: '' };
  try {
    pluginDir = await skills.buildPlugin(run.runId, run.skills ?? []);
  } catch (error) {
    preparing = undefined;
    return finish({ status: 'FAILED', outcome: `Could not load the team's skills: ${(error as Error).message}` });
  }
  try {
    files = await assets.prepare(run.assets ?? [], run.mode);
  } catch (error) {
    preparing = undefined;
    return finish({ status: 'FAILED', outcome: `Could not get the brief's files: ${(error as Error).message}` });
  }
  const cancelled = preparing?.cancelled;
  preparing = undefined;
  if (cancelled) return finish({ status: 'CANCELLED', outcome: 'Cancelled from the dashboard.' });

  // A production-line stage works inside the task's own folder, with the brief written there first.
  const role = run.role;
  let taskDir: string | undefined;
  if (role) {
    const prepared = prepareTaskFolder(run.workDir, role, config.folders.map((f) => f.path));
    if ('error' in prepared) return finish({ status: 'FAILED', failure: 'error', outcome: prepared.error });
    taskDir = prepared.dir;
  }

  const names = (run.skills ?? []).map((s) => s.name);
  const fileCount = (run.assets ?? []).length;
  runner.start(
    run,
    {
      onLogs: (entries, usage) => socket.emit(AgentEvents.runLog, { runId: run.runId, entries, ...(usage ? { usage } : {}) } satisfies RunLogPayload),
      onFinished: (result, fullText) => {
        if (!role || !taskDir) return finish(result);
        const dir = taskDir;
        // Save the reply first: some stages must leave it as one of their required files.
        const savedReplyTo = result.status === 'SUCCEEDED' && fullText ? saveReply(dir, role.saveReplyTo, fullText) : null;
        const missing = result.status === 'SUCCEEDED' ? missingFiles(dir, role.requiredFiles) : [];
        if (result.status !== 'SUCCEEDED' || role.deliverables.length === 0) {
          return finish({ ...result, report: { missing, savedReplyTo, uploaded: [], uploadErrors: [] } });
        }
        // The run stays open on the hub until its files are up, so the Review Booth has them when the stage ends.
        const controller = new AbortController();
        collecting = { runId: run.runId, controller };
        void uploader
          .upload(run.runId, dir, role.deliverables, (text) => console.log(text), controller.signal)
          .then((files) => {
            if (collecting?.runId === run.runId) collecting = undefined;
            if (controller.signal.aborted) return finish({ status: 'CANCELLED', outcome: 'Cancelled from the dashboard.' });
            finish({ ...result, report: { missing, savedReplyTo, ...files } });
          });
      },
    },
    {
      ...(pluginDir ? { pluginDir } : {}),
      addDirs: files.addDirs,
      promptSuffix: files.promptSuffix,
      ...(taskDir ? { cwd: taskDir } : {}),
      ...(role?.timeoutMinutes ? { timeoutMinutes: role.timeoutMinutes } : {}),
      notes: [
        ...(role ? [`${role.memberName} · ${role.stageLabel} · ${taskDir}`] : []),
        names.length ? `Loaded ${names.length} team skills: ${names.join(', ')}` : 'No team skills for this run.',
        ...(fileCount ? [`${fileCount} file${fileCount === 1 ? '' : 's'} from the brief ready.`] : []),
      ],
    },
  );
});

socket.on(AgentEvents.runCancel, ({ runId }: RunCancelPayload) => {
  if (preparing?.runId === runId) preparing.cancelled = true;
  else if (collecting?.runId === runId) collecting.controller.abort();
  else if (runner.cancel(runId)) console.log(`Cancelling run ${runId}`);
});

socket.on('disconnect', (reason) => {
  clearInterval(heartbeat);
  // The hub fails a run it loses track of, so stop it here too rather than let it finish unseen.
  if (runner.cancel()) console.warn('Stopped the running task because the hub connection dropped.');
  console.warn(`Disconnected from hub: ${reason}`);
  // The hub drops sockets with a bad token, and socket.io does not retry those.
  if (reason === 'io server disconnect') console.error('The hub refused this agent. Check AGENT_TOKEN.');
});

socket.on('connect_error', (error) => {
  console.warn(`Cannot reach hub at ${config.hubUrl}: ${error.message}`);
});

socket.on('exception', (error: unknown) => {
  console.error('The hub rejected a message:', error);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    clearInterval(heartbeat);
    runner.cancel();
    socket.close();
    process.exit(0);
  });
}
