import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import type { TimesheetEntry, TimesheetWorkspace } from '@/lib/types'
import { todayWeekMonthTotals } from '@/lib/timesheetLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatMinutes } from '@/lib/utils'

interface WorkspaceCardProps {
  workspace: TimesheetWorkspace
  entries: TimesheetEntry[]
}

export function WorkspaceCard({ workspace, entries }: WorkspaceCardProps) {
  const accent = ACCENT_COLOR_MAP[workspace.color]
  const totals = todayWeekMonthTotals(entries)

  return (
    <Link
      to={`/timesheet/${workspace.id}`}
      className="group block glass-panel rounded-[24px] p-5 transition-transform active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="size-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: `${accent.hex}22` }}
        >
          {workspace.emoji}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[16px] tracking-tight truncate">{workspace.name}</h3>
          <p className="text-[13px] text-black/50 dark:text-white/50 flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatMinutes(totals.week)} this week
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-4 py-3">
        <div className="text-center flex-1">
          <p className="text-[11px] text-black/45 dark:text-white/45">Today</p>
          <p className="font-semibold text-[15px] tabular-nums" style={{ color: totals.today > 0 ? accent.hex : undefined }}>
            {formatMinutes(totals.today)}
          </p>
        </div>
        <div className="text-center flex-1 border-x border-black/[0.06] dark:border-white/[0.08]">
          <p className="text-[11px] text-black/45 dark:text-white/45">This month</p>
          <p className="font-semibold text-[15px] tabular-nums">{formatMinutes(totals.month)}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[11px] text-black/45 dark:text-white/45">Total</p>
          <p className="font-semibold text-[15px] tabular-nums">{formatMinutes(totals.total)}</p>
        </div>
      </div>
    </Link>
  )
}
