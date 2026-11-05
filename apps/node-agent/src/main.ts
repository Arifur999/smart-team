import { hostname, platform } from 'node:os';
import { AGENT_NAMESPACE, AgentEvents, HEARTBEAT_MS, type RegisterPayload } from '@smart-team/shared';
import { io } from 'socket.io-client';
import { loadConfig } from './config.js';
import { detectTools, folderResources } from './resources.js';

const AGENT_VERSION = '0.1.0';

const config = loadConfig();

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

socket.on('disconnect', (reason) => {
  clearInterval(heartbeat);
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
    socket.close();
    process.exit(0);
  });
}
