import { Link } from 'react-router-dom'
import { CalendarClock, Clock } from 'lucide-react'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { useAllTimesheetEntries } from '@/hooks/useTimesheetEntries'
import { todayWeekMonthTotals } from '@/lib/timesheetLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatMinutes, toDateKey } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

export function TimesheetTodayWidget() {
  const { data: workspaces, isLoading: workspacesLoading } = useTimesheetWorkspaces()
  const workspaceIds = workspaces?.map((w) => w.id) ?? []
  const { data: entries, isLoading: entriesLoading } = useAllTimesheetEntries(workspaceIds)
  // Wait for entries whenever there are workspaces — otherwise totals briefly show 0m.
  const isLoading = workspacesLoading || (workspaceIds.length > 0 && entriesLoading)

  const totals = todayWeekMonthTotals(entries ?? [])
  const todayKey = toDateKey(new Date())

  const perWorkspaceToday = (workspaces ?? [])
    .map((workspace) => ({
      workspace,
      minutes: (entries ?? [])
        .filter((e) => e.workspace_id === workspace.id && e.entry_date === todayKey)
        .reduce((sum, e) => sum + e.minutes, 0),
    }))
    .filter((w) => w.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)

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
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
              <Clock className="size-6 text-accent-teal/70" />
              <p className="text-[13px] text-black/45 dark:text-white/45">No time logged yet today.</p>
            </div>
          )}
        </div>
      )}

      <Link
        to="/timesheet"
        className="mt-3 inline-flex text-[13px] font-medium text-accent-blue hover:brightness-110 transition-all"
      >
        View timesheet →
      </Link>
    </div>
  )
}
