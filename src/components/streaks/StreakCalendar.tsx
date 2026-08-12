import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { buildMonthGrid, hasPeriodTimeGoal, WEEKDAY_LABELS } from '@/lib/streakLogic'
import type { Streak, StreakEntry } from '@/lib/types'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { cn } from '@/lib/utils'

interface StreakCalendarProps {
  streak: Streak
  entries: StreakEntry[]
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
  onSelectDay: (dateKey: string) => void
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
  onSelectDay,
}: StreakCalendarProps) {
  const days = buildMonthGrid(year, month, streak, entries)
  const accent = ACCENT_COLOR_MAP[streak.color]
  const periodGoal = hasPeriodTimeGoal(streak)

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
          const partial = day.goalMinutes != null && !day.completed && day.minutes > 0
          // Period goals don't set per-day `completed`; any logged minutes get a left-dot.
          const loggedForPeriod = periodGoal && day.minutes > 0
          return (
            <button
              key={day.key}
              disabled={disabled}
              onClick={() => onSelectDay(day.key)}
              className={cn(
                'relative aspect-square rounded-xl flex items-center justify-center text-[13px] font-medium transition-all',
                'active:scale-90',
                !day.inCurrentMonth && 'opacity-30',
                disabled && !day.completed && 'cursor-default',
                day.isToday && !day.completed && 'ring-2 ring-inset ring-accent-blue/50',
              )}
              style={{
                backgroundColor: day.completed
                  ? accent.hex
                  : partial
                    ? `${accent.hex}40`
                    : day.isScheduled
                      ? `${accent.hex}12`
                      : 'transparent',
                color: day.completed ? 'white' : undefined,
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {day.completed ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </motion.div>
                ) : (
                  <motion.span key="date" initial={false} animate={{ opacity: 1 }}>
                    {day.date.getDate()}
                  </motion.span>
                )}
              </AnimatePresence>
              {day.hasNote && (
                <span
                  className="absolute bottom-1 right-1 size-1.5 rounded-full"
                  style={{ backgroundColor: day.completed ? 'white' : accent.hex }}
                />
              )}
              {loggedForPeriod && (
                <span
                  className="absolute bottom-1 left-1 size-1.5 rounded-full"
                  style={{ backgroundColor: accent.hex }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
