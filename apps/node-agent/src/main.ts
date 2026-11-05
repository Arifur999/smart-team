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

const AGENT_VERSION = '0.2.0';

const config = loadConfig();
const runner = new ClaudeRunner(config.claude, () => config.folders.map((f) => f.path));

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
  socket.emit(AgentEvents.register, payload, () => {
    console.log(`Registered as "${payload.name}" with ${payload.resources.length} resources`);
  });

  clearInterval(heartbeat);
  heartbeat = setInterval(() => socket.emit(AgentEvents.heartbeat), HEARTBEAT_MS);
});

socket.on(AgentEvents.runStart, (run: RunStartPayload) => {
  console.log(`Starting ${run.mode.toLowerCase()} run ${run.runId} in ${run.workDir}`);
  runner.start(run, {
    onLogs: (entries) => socket.emit(AgentEvents.runLog, { runId: run.runId, entries } satisfies RunLogPayload),
    onFinished: (result) => {
      console.log(`Run ${run.runId} ended: ${result.status}`);
      socket.emit(AgentEvents.runFinished, { runId: run.runId, ...result } satisfies RunFinishedPayload);
    },
  });
});

socket.on(AgentEvents.runCancel, ({ runId }: RunCancelPayload) => {
  if (runner.cancel(runId)) console.log(`Cancelling run ${runId}`);
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
