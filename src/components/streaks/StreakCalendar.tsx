import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { buildMonthGrid, WEEKDAY_LABELS } from '@/lib/streakLogic'
import type { Streak, StreakEntry } from '@/lib/types'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { cn } from '@/lib/utils'

interface StreakCalendarProps {
  streak: Streak
  entries: StreakEntry[]
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
  onToggleDay: (dateKey: string, completed: boolean) => void
  pendingKey?: string | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function StreakCalendar({
  streak,
  entries,
  year,
  month,
  onMonthChange,
  onToggleDay,
  pendingKey,
}: StreakCalendarProps) {
  const days = buildMonthGrid(year, month, streak, entries)
  const accent = ACCENT_COLOR_MAP[streak.color]

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
          const disabled = day.isFuture || (!day.isScheduled && !day.completed)
          const isPending = pendingKey === day.key
          return (
            <button
              key={day.key}
              disabled={disabled || isPending}
              onClick={() => onToggleDay(day.key, !day.completed)}
              className={cn(
                'relative aspect-square rounded-xl flex items-center justify-center text-[13px] font-medium transition-all',
                'active:scale-90',
                !day.inCurrentMonth && 'opacity-30',
                disabled && !day.completed && 'cursor-default',
                day.isToday && !day.completed && 'ring-2 ring-inset ring-accent-blue/50',
              )}
              style={{
                backgroundColor: day.completed ? accent.hex : day.isScheduled ? `${accent.hex}12` : 'transparent',
                color: day.completed ? 'white' : undefined,
              }}
            >
              {day.completed ? <Check className="size-4" strokeWidth={3} /> : day.date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
