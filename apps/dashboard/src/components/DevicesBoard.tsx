'use client';

import { useEffect, useState } from 'react';
import { useDevices, type HubConnection } from '@/hooks/useDevices';
import { DeviceCard } from './DeviceCard';

const CONNECTION_LABEL: Record<HubConnection, string> = {
  connecting: 'Connecting to hub…',
  connected: 'Live',
  disconnected: 'Hub unreachable',
};

export function DevicesBoard() {
  const { devices, connection } = useDevices();
  const now = useNow(5_000);
  const onlineCount = devices?.filter((d) => d.status === 'ONLINE').length ?? 0;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
          <p className="mt-1 text-sm text-muted">
            {devices ? `${onlineCount} of ${devices.length} PCs online` : 'Waiting for the first update'}
          </p>
        </div>
        <span
          role="status"
          className={`inline-flex items-center gap-2 text-sm ${connection === 'disconnected' ? 'text-danger' : 'text-muted'}`}
        >
          <span
            className={`size-2 rounded-full ${
              connection === 'connected' ? 'bg-ok' : connection === 'disconnected' ? 'bg-danger' : 'bg-idle'
            }`}
            aria-hidden
          />
          {CONNECTION_LABEL[connection]}
        </span>
      </header>

      {devices && devices.length === 0 && (
        <section className="mt-8 rounded-xl border border-dashed border-line p-8 text-center">
          <h2 className="font-medium">No PCs connected yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Run the node agent on each PC with the hub address and the shared AGENT_TOKEN. It shows up here within a few
            seconds.
          </p>
        </section>
      )}

      {devices && devices.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} now={now} />
          ))}
        </div>
      )}
    </main>
  );
}

/**
 * Re-renders every `intervalMs` so "last seen" labels stay current.
 * Starts at null: reading the clock during render breaks Next's prerender.
 */
function useNow(intervalMs: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
