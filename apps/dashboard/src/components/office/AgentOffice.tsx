'use client';

import { TEAMS, type TeamId } from '@smart-team/shared';
import { useMemo, useState } from 'react';
import { useAgentStats } from '@/hooks/useAgentStats';
import { useDevices } from '@/hooks/useDevices';
import { useOfficeTeam } from '@/hooks/useOfficeTeam';
import { useTasks } from '@/hooks/useTasks';
import { officeMembers } from '@/lib/office';
import { NewTaskForm } from '../NewTaskForm';
import { MemberDetail } from './MemberDetail';
import { MemberList } from './MemberList';
import { OfficeMap } from './OfficeMap';

export function AgentOffice() {
  const { tasks } = useTasks();
  const { devices, connection } = useDevices();
  const [teamId, setTeamId] = useOfficeTeam();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const chooseTeam = (id: TeamId) => {
    setTeamId(id);
    setSelectedId(null);
  };

  const members = useMemo(() => officeMembers(teamId, tasks ?? []), [teamId, tasks]);
  const selected = members.find((m) => m.id === selectedId) ?? null;
  const team = TEAMS.find((t) => t.id === teamId)!;
  const busyCount = members.filter((m) => m.activity.tone === 'busy' || m.activity.tone === 'waiting').length;
  const stats = useAgentStats();
  const onlinePcs = devices?.filter((d) => d.status === 'ONLINE').length ?? 0;

  return (
    <main id="main" className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Agent Office
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${connection === 'connected' ? 'text-ok' : 'text-muted'}`}>
              <span className={`size-1.5 rounded-full ${connection === 'connected' ? 'animate-pulse bg-ok' : 'bg-idle'}`} aria-hidden />
              {connection === 'connected' ? 'LIVE' : 'OFFLINE'}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {team.label} · {team.focus} · {busyCount} active · {onlinePcs} PC{onlinePcs === 1 ? '' : 's'} online
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
          New task for {team.label}
        </button>
      </header>

      <div role="tablist" aria-label="Team" className="mt-5 flex flex-wrap gap-1.5">
        {TEAMS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === teamId}
            onClick={() => chooseTeam(t.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
              t.id === teamId ? 'border-foreground/30 bg-surface font-medium' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <div className="order-2 rounded-xl border border-line bg-surface p-3 lg:order-1">
          <MemberList members={members} stats={stats} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          {/* Below this width the characters would overlap, so phones scroll the map sideways instead. */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="min-w-[680px]">
              <OfficeMap members={members} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Positions follow live task status. Team Leaders split work across members from phase 5; until then the first worker
            carries out approved plans.
          </p>
        </div>
        <div className="order-3 hidden xl:block">
          {selected ? (
            <MemberDetail member={selected} stats={stats[selected.id]} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="grid h-full min-h-40 place-items-center rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              Click a character on the map or in the list to see who they are, how long they have worked and how many tokens they used.
            </div>
          )}
        </div>
      </div>

      {/* Below xl there is no room for a side panel, so the card slides up from the bottom instead. */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] p-3 xl:hidden">
          <div className="mx-auto h-[min(640px,80vh)] max-w-lg shadow-2xl">
            <MemberDetail member={selected} stats={stats[selected.id]} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="New task">
          <div className="w-full max-w-2xl">
            <NewTaskForm
              defaultTeam={teamId}
              onClose={() => setCreating(false)}
              onCreated={(task) => {
                // Stay in the office and follow the plan agent, who picks the task up first.
                setCreating(false);
                if (task.team !== teamId) setTeamId(task.team);
                setSelectedId('maria-hill');
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
