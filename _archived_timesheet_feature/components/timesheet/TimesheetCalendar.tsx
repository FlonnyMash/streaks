import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { buildTimesheetMonthGrid } from '@/lib/timesheetLogic'
import type { TimesheetEntry } from '@/lib/types'
import { cn, formatMinutes } from '@/lib/utils'

interface TimesheetCalendarProps {
  entries: TimesheetEntry[]
  year: number
  month: number
  accentHex: string
  onMonthChange: (year: number, month: number) => void
  onSelectDay: (dateKey: string) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function TimesheetCalendar({ entries, year, month, accentHex, onMonthChange, onSelectDay }: TimesheetCalendarProps) {
  const days = buildTimesheetMonthGrid(year, month, entries)
  const maxMinutes = Math.max(1, ...days.map((d) => d.minutes))

  function goPrev() {
    if (month === 0) onMonthChange(year - 1, 11)
    else onMonthChange(year, month - 1)
  }
  function goNext() {
    if (month === 11) onMonthChange(year + 1, 0)
    else onMonthChange(year, month + 1)
  }

  return (
    <div className="glass-panel rounded-[28px] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={goPrev}
          aria-label="Previous month"
          className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3 className="font-semibold text-[15px] tracking-tight">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button
          onClick={goNext}
          aria-label="Next month"
          className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[11px] font-medium text-black/40 dark:text-white/40 py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const ratio = day.minutes / maxMinutes
          return (
            <motion.button
              key={day.key}
              onClick={() => onSelectDay(day.key)}
              layout
              className={cn(
                'relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all',
                'active:scale-90',
                !day.inCurrentMonth && 'opacity-30',
                day.isToday && 'ring-2 ring-inset ring-accent-blue/50',
              )}
              style={{
                backgroundColor: day.minutes > 0 ? `${accentHex}${Math.round(20 + ratio * 65)
                  .toString(16)
                  .padStart(2, '0')}` : 'transparent',
              }}
            >
              <span className="text-[13px] font-medium">{day.date.getDate()}</span>
              {day.minutes > 0 && (
                <span className="text-[9px] font-semibold tabular-nums" style={{ color: ratio > 0.4 ? 'white' : accentHex }}>
                  {formatMinutes(day.minutes)}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
