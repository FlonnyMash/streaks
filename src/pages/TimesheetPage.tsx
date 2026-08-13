import { useMemo, useState } from 'react'
import { CalendarClock, Download, Play, Plus, Sparkles } from 'lucide-react'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { useAllTimesheetEntries } from '@/hooks/useTimesheetEntries'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { WorkspaceCard } from '@/components/timesheet/WorkspaceCard'
import { TimesheetCalendar } from '@/components/timesheet/TimesheetCalendar'
import { DaySummaryModal } from '@/components/timesheet/DaySummaryModal'
import { CreateWorkspaceModal } from '@/components/timesheet/CreateWorkspaceModal'
import { ExportTimesheetModal } from '@/components/timesheet/ExportTimesheetModal'
import { ActiveTimerBanner } from '@/components/timesheet/ActiveTimerBanner'
import { ClockInPickerModal } from '@/components/timesheet/ClockInPickerModal'
import { Spinner } from '@/components/ui/Spinner'
import {
  FeatureGetStartedButton,
  FeatureHelpIconButton,
  FeatureHelpModal,
} from '@/components/ui/FeatureHelp'

const SUMMARY_ACCENT = '#0a84ff'

export function TimesheetPage() {
  const { data: workspaces, isLoading: workspacesLoading } = useTimesheetWorkspaces()
  const workspaceIds = workspaces?.map((w) => w.id) ?? []
  const { data: entries } = useAllTimesheetEntries(workspaceIds)
  const { start, runningWorkspaceIds: busyIds } = useTimesheetTimer()
  const [createOpen, setCreateOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [clockInOpen, setClockInOpen] = useState(false)

  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)

  const isEmpty = !workspacesLoading && workspaces?.length === 0
  const showHelpIcon = Boolean(workspaces && workspaces.length > 0)
  const canClockIn = Boolean(workspaces?.some((w) => !busyIds.includes(w.id)))
  const entriesByWorkspace = (workspaceId: string) => entries?.filter((e) => e.workspace_id === workspaceId) ?? []

  const dayBreakdown = useMemo(() => {
    if (!selectedDayKey || !entries || !workspaces) return []
    const totals = new Map<string, number>()
    for (const entry of entries) {
      if (entry.entry_date !== selectedDayKey) continue
      totals.set(entry.workspace_id, (totals.get(entry.workspace_id) ?? 0) + entry.minutes)
    }
    return workspaces
      .filter((w) => totals.has(w.id))
      .map((workspace) => ({ workspace, minutes: totals.get(workspace.id) ?? 0 }))
      .sort((a, b) => b.minutes - a.minutes)
  }, [selectedDayKey, entries, workspaces])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">Timesheet</h1>
            {showHelpIcon && <FeatureHelpIconButton onClick={() => setHelpOpen(true)} className="sm:hidden" />}
            {showHelpIcon && canClockIn && (
              <button
                onClick={() => setClockInOpen(true)}
                aria-label="Clock in"
                title="Clock in"
                className="sm:hidden size-8 rounded-full inline-flex items-center justify-center text-black/40 dark:text-white/40 hover:text-accent-blue hover:bg-accent-blue/10 active:scale-95 transition-all shrink-0"
              >
                <Play className="size-[18px] fill-current" />
              </button>
            )}
            {showHelpIcon && (
              <button
                onClick={() => setExportOpen(true)}
                aria-label="Export timesheet"
                title="Export timesheet"
                className="sm:hidden size-8 rounded-full inline-flex items-center justify-center text-black/40 dark:text-white/40 hover:text-accent-blue hover:bg-accent-blue/10 active:scale-95 transition-all shrink-0"
              >
                <Download className="size-[18px]" />
              </button>
            )}
          </div>
          <p className="text-black/50 dark:text-white/50 text-[15px] mt-0.5">Log time across projects and workspaces.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {showHelpIcon && <FeatureHelpIconButton onClick={() => setHelpOpen(true)} />}
          {showHelpIcon && (
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-black/5 dark:bg-white/10 font-medium hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
            >
              <Download className="size-4" />
              Export
            </button>
          )}
          {showHelpIcon && (
            <button
              onClick={() => setClockInOpen(true)}
              disabled={!canClockIn}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-black/5 dark:bg-white/10 font-medium hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <Play className="size-4 fill-current" />
              Clock in
            </button>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-accent-blue text-white font-medium shadow-[0_8px_20px_-6px_rgba(10,132,255,0.6)] hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            New Workspace
          </button>
        </div>
      </div>

      <ActiveTimerBanner />

      {workspacesLoading && <Spinner />}

      {isEmpty && (
        <div className="glass-panel rounded-[28px] p-10 flex flex-col items-center text-center gap-3 mt-6">
          <Sparkles className="size-8 text-accent-orange" />
          <h2 className="font-semibold text-lg">No workspaces yet</h2>
          <p className="text-black/50 dark:text-white/50 text-[15px] max-w-xs">
            Create a workspace for each project, client, or job you want to track time for.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-2 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-accent-blue text-white font-medium active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            Create a workspace
          </button>
          <FeatureGetStartedButton onClick={() => setHelpOpen(true)} />
        </div>
      )}

      {!workspacesLoading && workspaces && workspaces.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {workspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} entries={entriesByWorkspace(workspace.id)} />
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3 px-1">
            <CalendarClock className="size-4 text-black/45 dark:text-white/45" />
            <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide">
              Summary — all workspaces
            </h2>
          </div>
          <TimesheetCalendar
            entries={entries ?? []}
            year={view.year}
            month={view.month}
            accentHex={SUMMARY_ACCENT}
            onMonthChange={(year, month) => setView({ year, month })}
            onSelectDay={setSelectedDayKey}
          />
        </>
      )}

      <button
        onClick={() => setCreateOpen(true)}
        aria-label="New workspace"
        className="sm:hidden fixed right-5 fab-above-tabbar z-40 size-14 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(10,132,255,0.7)] active:scale-90 transition-transform"
      >
        <Plus className="size-6" />
      </button>

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <FeatureHelpModal feature="timesheet" open={helpOpen} onClose={() => setHelpOpen(false)} />

      <ClockInPickerModal
        open={clockInOpen}
        onClose={() => setClockInOpen(false)}
        workspaces={workspaces ?? []}
        busyWorkspaceIds={busyIds}
        onStart={(workspaceId, options) => start(workspaceId, options)}
      />

      <ExportTimesheetModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="All Workspaces"
        titleEmoji="🗂️"
        accentHex={SUMMARY_ACCENT}
        workspaces={(workspaces ?? []).map((w) => ({ id: w.id, name: w.name, emoji: w.emoji }))}
        entries={entries ?? []}
      />

      <DaySummaryModal
        open={selectedDayKey !== null}
        onClose={() => setSelectedDayKey(null)}
        dateKey={selectedDayKey}
        breakdown={dayBreakdown}
      />
    </div>
  )
}
