import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { GlassModal } from '@/components/ui/GlassModal'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatMinutes, fromDateKey } from '@/lib/utils'
import type { TimesheetWorkspace } from '@/lib/types'

interface DaySummaryModalProps {
  open: boolean
  onClose: () => void
  dateKey: string | null
  breakdown: Array<{ workspace: TimesheetWorkspace; minutes: number }>
}

export function DaySummaryModal({ open, onClose, dateKey, breakdown }: DaySummaryModalProps) {
  if (!dateKey) return null
  const total = breakdown.reduce((sum, b) => sum + b.minutes, 0)

  return (
    <GlassModal open={open} onClose={onClose} title={format(fromDateKey(dateKey), 'EEEE, MMM d')}>
      <div className="flex flex-col gap-4">
        {total > 0 ? (
          <p className="text-center text-[13px] text-black/50 dark:text-white/50 -mt-1">
            <span className="font-semibold text-accent-blue">{formatMinutes(total)}</span> logged across{' '}
            {breakdown.length} workspace{breakdown.length === 1 ? '' : 's'}
          </p>
        ) : (
          <p className="text-center text-[13px] text-black/50 dark:text-white/50 -mt-1">Nothing logged this day.</p>
        )}

        <div className="flex flex-col gap-2">
          {breakdown.map(({ workspace, minutes }) => {
            const accent = ACCENT_COLOR_MAP[workspace.color]
            return (
              <Link
                key={workspace.id}
                to={`/timesheet/${workspace.id}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
              >
                <div
                  className="size-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: `${accent.hex}22` }}
                >
                  {workspace.emoji}
                </div>
                <span className="flex-1 min-w-0 font-medium text-[14px] truncate">{workspace.name}</span>
                <span className="font-semibold text-[14px] tabular-nums" style={{ color: accent.hex }}>
                  {formatMinutes(minutes)}
                </span>
              </Link>
            )
          })}
        </div>

        <p className="text-center text-[12px] text-black/40 dark:text-white/40">
          Open a workspace to add or edit time for this day.
        </p>
      </div>
    </GlassModal>
  )
}
