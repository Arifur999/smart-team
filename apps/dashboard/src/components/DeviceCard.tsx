import type { DeviceView } from '@smart-team/shared';
import { timeAgo } from '@/lib/time';

export function DeviceCard({ device, now }: { device: DeviceView; now: number | null }) {
  const online = device.status === 'ONLINE';
  const tools = device.resources.filter((r) => r.kind === 'TOOL');
  const folders = device.resources.filter((r) => r.kind === 'FOLDER');

  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{device.name}</h2>
          <p className="mt-0.5 truncate text-sm text-muted">
            {[device.ip, device.platform, `agent ${device.agentVersion}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            online ? 'bg-ok-soft text-ok' : 'bg-idle-soft text-muted'
          }`}
        >
          <span className={`size-2 rounded-full ${online ? 'bg-ok' : 'bg-idle'}`} aria-hidden />
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      {/* Heartbeats are not pushed to the dashboard, so lastSeenAt only means something once a PC is offline. */}
      {!online && now !== null && <p className="mt-2 text-xs text-muted">Last seen {timeAgo(device.lastSeenAt, now)}</p>}

      <section className="mt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Tools</h3>
        {tools.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No known tools found.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <li key={tool.name} className="rounded-md bg-chip px-2 py-1 font-mono text-xs">
                {tool.name}
                {tool.version && <span className="text-muted"> {tool.version}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Shared folders</h3>
        {folders.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None shared. Add them in agent.config.json on this PC.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {folders.map((folder) => (
              <li key={`${folder.name}-${folder.path}`} className="text-sm">
                <div className="font-medium">{folder.name}</div>
                <div className="truncate font-mono text-xs text-muted" title={folder.path}>
                  {folder.path}
                </div>
                {folder.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {folder.tags.map((tag) => (
                      <span key={tag} className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
