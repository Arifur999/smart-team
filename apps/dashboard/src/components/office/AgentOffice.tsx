'use client';

import { skillRoleKey, TEAMS, type TaskSummary, type TeamId } from '@smart-team/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAgentStats } from '@/hooks/useAgentStats';
import { useDevices } from '@/hooks/useDevices';
import { useOfficeTeam } from '@/hooks/useOfficeTeam';
import { useSkillRoles } from '@/hooks/useSkillRoles';
import { useTasks } from '@/hooks/useTasks';
import { useTeamChat } from '@/hooks/useTeamChat';
import { officeMembers } from '@/lib/office';
import { NewTaskForm } from '../NewTaskForm';
import { MemberDetail } from './MemberDetail';
import { MemberList } from './MemberList';
import { NeedsYou } from './NeedsYou';
import { OfficeMap } from './OfficeMap';
import { OfficeTerminal } from './OfficeTerminal';
import { PhaseSteps } from './PhaseSteps';
import { TeamChat } from './TeamChat';

type Panel = 'terminal' | 'member';

export function AgentOffice() {
  const router = useRouter();
  const { tasks } = useTasks();
  const { devices, connection } = useDevices();
  const [teamId, setTeamId] = useOfficeTeam();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('terminal');
  const [showTeam, setShowTeam] = useState(true);
  const [creating, setCreating] = useState(false);
  const stats = useAgentStats();
  const skillRoles = useSkillRoles();
  const chat = useTeamChat(teamId, tasks);

  const team = TEAMS.find((t) => t.id === teamId)!;
  const members = useMemo(() => officeMembers(teamId, tasks ?? []), [teamId, tasks]);
  const selected = members.find((m) => m.id === selectedId) ?? null;
  const teamTasks = (tasks ?? []).filter((t) => t.team === teamId);
  // The task in focus: the one going now, else the one waiting for you, else the latest.
  const focus = teamTasks.find((t) => t.status === 'RUNNING') ?? teamTasks.find((t) => t.status === 'AWAITING_APPROVAL') ?? teamTasks[0];
  const waiting = (tasks ?? []).filter((t) => t.status === 'AWAITING_APPROVAL').reverse();
  const busyCount = members.filter((m) => m.activity.tone === 'busy' || m.activity.tone === 'waiting').length;
  const onlinePcs = devices?.filter((d) => d.status === 'ONLINE').length ?? 0;

  const select = (id: string) => {
    setSelectedId(id);
    setPanel('member');
  };
  const chooseTeam = (id: TeamId) => {
    setTeamId(id);
    setSelectedId(null);
    setPanel('terminal');
  };
  const openTask = (task: TaskSummary) => router.push(`/tasks/${task.id}`);

  return (
    <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <NeedsYou waiting={waiting} onOpen={openTask} />
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 lg:max-w-[55%]">
          <PhaseSteps task={focus} />
        </div>
      </div>

      <header className="mt-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 flex items-center gap-2 text-lg font-semibold tracking-tight">
          Agent Office
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${connection === 'connected' ? 'text-ok' : 'text-muted'}`}>
            <span className={`size-1.5 rounded-full ${connection === 'connected' ? 'animate-pulse bg-ok' : 'bg-idle'}`} aria-hidden />
            {connection === 'connected' ? 'LIVE' : 'OFFLINE'}
          </span>
        </h1>
        <span className="text-xs text-muted">
          {busyCount} active · {onlinePcs} PC{onlinePcs === 1 ? '' : 's'} online
        </span>

        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="sr-only">Team</span>
          <span className="size-2 rounded-full" style={{ background: team.color }} aria-hidden />
          <select
            value={teamId}
            onChange={(e) => chooseTeam(e.target.value as TeamId)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
          >
            {TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} · {t.focus}
              </option>
            ))}
          </select>
        </label>
        <ToolbarButton active={showTeam} onClick={() => setShowTeam(!showTeam)}>
          ☰ Team
        </ToolbarButton>
        <ToolbarButton active={panel === 'terminal'} onClick={() => setPanel('terminal')}>
          ▣ Terminal
        </ToolbarButton>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background">
          + New task
        </button>
      </header>

      <div
        className={`mt-3 grid gap-3 ${
          showTeam ? 'xl:grid-cols-[240px_minmax(0,1fr)_380px]' : 'xl:grid-cols-[minmax(0,1fr)_380px]'
        }`}
      >
        {showTeam && (
          <div className="order-2 max-h-[calc(100dvh-14rem)] overflow-y-auto rounded-xl border border-line bg-surface p-2 xl:order-1">
            <MemberList members={members} stats={stats} selectedId={selectedId} onSelect={select} />
          </div>
        )}

        <div className="order-1 min-w-0 space-y-3 xl:order-2">
          {/* Below this width the characters would overlap, so phones scroll the map sideways instead. */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="min-w-[700px]">
              <OfficeMap members={members} selectedId={selectedId} onSelect={select} />
            </div>
          </div>
          <TeamChat lines={chat} />
        </div>

        <div className="order-3 flex min-h-[420px] flex-col xl:h-[calc(100dvh-14rem)]">
          <div role="tablist" aria-label="Side panel" className="mb-2 flex gap-1 text-sm">
            <PanelTab active={panel === 'terminal'} onClick={() => setPanel('terminal')}>
              Terminal
            </PanelTab>
            <PanelTab active={panel === 'member'} onClick={() => setPanel('member')} disabled={!selected}>
              {selected ? selected.name : 'Member'}
            </PanelTab>
          </div>
          <div className="min-h-0 flex-1">
            {panel === 'member' && selected ? (
              <MemberDetail
                member={selected}
                stats={stats[selected.id]}
                skills={skillRoles[skillRoleKey(selected.teamId, selected.role)]}
                onClose={() => setPanel('terminal')}
              />
            ) : (
              <OfficeTerminal task={focus} />
            )}
          </div>
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="New task">
          <div className="w-full max-w-2xl">
            <NewTaskForm
              defaultTeam={teamId}
              onClose={() => setCreating(false)}
              onCreated={(task) => {
                // Stay in the office and watch the terminal while the plan agent picks it up.
                setCreating(false);
                if (task.team !== teamId) setTeamId(task.team);
                setPanel('terminal');
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function ToolbarButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-sm ${active ? 'border-accent/50 bg-accent-soft text-accent' : 'border-line text-muted hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

function PanelTab({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`max-w-48 truncate rounded-md px-3 py-1 ${active ? 'bg-surface font-medium shadow-sm ring-1 ring-line' : 'text-muted hover:text-foreground disabled:opacity-40'}`}
    >
      {children}
    </button>
  );
}
