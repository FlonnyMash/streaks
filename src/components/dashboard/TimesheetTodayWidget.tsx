import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Clock, Play, Square } from 'lucide-react'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { useAllTimesheetEntries } from '@/hooks/useTimesheetEntries'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { ClockInPickerModal } from '@/components/timesheet/ClockInPickerModal'
import { todayWeekMonthTotals, formatElapsedClock } from '@/lib/timesheetLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatMinutes, toDateKey } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

export function TimesheetTodayWidget() {
  const { data: workspaces, isLoading: workspacesLoading } = useTimesheetWorkspaces()
  const workspaceIds = workspaces?.map((w) => w.id) ?? []
  const { data: entries, isLoading: entriesLoading } = useAllTimesheetEntries(workspaceIds)
  const { sessions, elapsedMsFor, start, requestStop, isSyncing } = useTimesheetTimer()
  const [pickerOpen, setPickerOpen] = useState(false)
  // Wait for entries whenever there are workspaces — otherwise totals briefly show 0m.
  const isLoading = workspacesLoading || (workspaceIds.length > 0 && entriesLoading)

  const totals = todayWeekMonthTotals(entries ?? [])
  const todayKey = toDateKey(new Date())
  const busyIds = sessions.map((s) => s.workspaceId)
  const available = (workspaces ?? []).filter((w) => !busyIds.includes(w.id))

  const perWorkspaceToday = (workspaces ?? [])
    .map((workspace) => ({
      workspace,
      minutes: (entries ?? [])
        .filter((e) => e.workspace_id === workspace.id && e.entry_date === todayKey)
        .reduce((sum, e) => sum + e.minutes, 0),
    }))
    .filter((w) => w.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)

  function handleClockIn() {
    if (available.length === 0) return
    setPickerOpen(true)
  }

  return (
    <div className="glass-panel rounded-[24px] p-5 flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="size-4 text-accent-teal" />
        <h2 className="font-semibold text-[15px]">Timesheet</h2>
      </div>

      {isLoading && (
        <div className="flex-1 min-h-0">
          <Spinner className="size-5" />
        </div>
      )}

      {!isLoading && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] p-3">
              <p className="text-[11px] text-black/45 dark:text-white/45 uppercase tracking-wide mb-1">Today</p>
              <p className="text-2xl font-bold tabular-nums">{formatMinutes(totals.today)}</p>
            </div>
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] p-3">
              <p className="text-[11px] text-black/45 dark:text-white/45 uppercase tracking-wide mb-1">This week</p>
              <p className="text-2xl font-bold tabular-nums">{formatMinutes(totals.week)}</p>
            </div>
          </div>

          {sessions.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {sessions.map((session) => {
                const workspace = workspaces?.find((w) => w.id === session.workspaceId)
                const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null
                return (
                  <div key={session.id} className="rounded-2xl bg-accent-teal/10 px-3.5 py-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="relative flex size-2.5 shrink-0">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-teal opacity-60" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-accent-teal" />
                      </span>
                      {workspace ? (
                        <>
                          <div
                            className="size-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                            style={{ backgroundColor: accent ? `${accent.hex}22` : undefined }}
                          >
                            {workspace.emoji}
                          </div>
                          <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{workspace.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 min-w-0 truncate text-[13px] font-medium">Timer running</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xl font-bold tabular-nums tracking-tight">
                        {formatElapsedClock(elapsedMsFor(session.id))}
                      </span>
                      <Button type="button" size="sm" onClick={() => requestStop(session.id)}>
                        <Square className="size-3.5 fill-current" />
                        Clock out
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {available.length > 0 && (
            <Button
              type="button"
              size="md"
              className="w-full mb-3"
              onClick={handleClockIn}
              loading={isSyncing}
            >
              <Play className="size-4 fill-current" />
              Clock in
            </Button>
          )}

          {perWorkspaceToday.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {perWorkspaceToday.map(({ workspace, minutes }) => {
                const accent = ACCENT_COLOR_MAP[workspace.color]
                return (
                  <div key={workspace.id} className="flex items-center gap-3 px-1 py-1.5">
                    <div
                      className="size-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `${accent.hex}22` }}
                    >
                      {workspace.emoji}
                    </div>
                    <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{workspace.name}</span>
                    <span className="text-[13px] font-semibold tabular-nums shrink-0" style={{ color: accent.hex }}>
                      {formatMinutes(minutes)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            sessions.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
                <Clock className="size-6 text-accent-teal/70" />
                <p className="text-[13px] text-black/45 dark:text-white/45">
                  {workspaces && workspaces.length === 0
                    ? 'Create a workspace to start tracking.'
                    : 'No time logged yet today.'}
                </p>
              </div>
            )
          )}
        </div>
      )}

      <Link
        to="/timesheet"
        className="mt-3 inline-flex text-[13px] font-medium text-accent-blue hover:brightness-110 transition-all"
      >
        View timesheet →
      </Link>

      <ClockInPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        workspaces={workspaces ?? []}
        busyWorkspaceIds={busyIds}
        onStart={(workspaceId, startedAt) => start(workspaceId, startedAt ? { startedAt } : undefined)}
      />
    </div>
  )
}
