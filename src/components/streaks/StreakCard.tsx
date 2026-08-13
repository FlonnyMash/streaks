import { Link } from 'react-router-dom'
import { Flame, Clock } from 'lucide-react'
import type { Streak, StreakEntry } from '@/lib/types'
import { computeStreakStats, hasDayTimeGoal, hasPeriodTimeGoal, previewSlots } from '@/lib/streakLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatMinutes, toDateKey } from '@/lib/utils'
import { eachDayOfInterval, endOfWeek, startOfDay, startOfWeek } from 'date-fns'

interface StreakCardProps {
  streak: Streak
  entries: StreakEntry[]
}

function subtitleFor(streak: Streak): string {
  if (streak.track_time && streak.time_goal_period && streak.time_goal_minutes) {
    const periodLabel = streak.time_goal_period === 'day' ? 'day' : streak.time_goal_period === 'week' ? 'week' : 'month'
    return `${formatMinutes(streak.time_goal_minutes)} / ${periodLabel}`
  }
  if (streak.frequency_type === 'weekdays') return 'Custom days'
  if (streak.frequency_type === 'times_per_week') return `${streak.target_count ?? 1}x per week`
  return 'Every day'
}

export function StreakCard({ streak, entries }: StreakCardProps) {
  const stats = computeStreakStats(streak, entries)
  const accent = ACCENT_COLOR_MAP[streak.color]
  const completedDates = new Set(entries.filter((e) => e.completed).map((e) => e.entry_date))
  const minutesByDate = new Map<string, number>()
  for (const e of entries) {
    if (e.minutes != null) minutesByDate.set(e.entry_date, (minutesByDate.get(e.entry_date) ?? 0) + e.minutes)
  }
  const dayGoal = hasDayTimeGoal(streak)
  const periodGoal = hasPeriodTimeGoal(streak)

  const today = startOfDay(new Date())
  const slots = previewSlots(streak, completedDates, today)
  const thisWeekDays = eachDayOfInterval({
    start: startOfWeek(today, { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 }),
  })
  const thisWeekMinutes = thisWeekDays.reduce((sum, date) => sum + (minutesByDate.get(toDateKey(date)) ?? 0), 0)

  return (
    <Link
      to={`/streaks/${streak.id}`}
      className="group block glass-panel rounded-[24px] p-5 transition-transform active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `${accent.hex}22` }}
          >
            {streak.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[16px] tracking-tight truncate">{streak.name}</h3>
            <p className="text-[13px] text-black/50 dark:text-white/50">{subtitleFor(streak)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 pl-2">
          <Flame
            className="size-5"
            style={{ color: stats.currentStreak > 0 ? accent.hex : undefined }}
            fill={stats.currentStreak > 0 ? accent.hex : 'none'}
            fillOpacity={0.25}
          />
          <span className="font-bold text-lg tabular-nums" style={{ color: stats.currentStreak > 0 ? accent.hex : undefined }}>
            {stats.currentStreak}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {slots.map((slot) => {
          const mins = slot.date ? (minutesByDate.get(toDateKey(slot.date)) ?? 0) : 0
          const partial = dayGoal && !slot.completed && mins > 0
          return (
            <div
              key={slot.key}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold tracking-wide"
              style={{
                backgroundColor: slot.completed
                  ? accent.hex
                  : partial
                    ? `${accent.hex}40`
                    : slot.scheduled
                      ? `${accent.hex}14`
                      : 'transparent',
                color: slot.completed ? '#fff' : accent.hex,
                opacity: slot.scheduled ? 1 : 0.35,
              }}
            >
              {slot.label ?? (!slot.scheduled ? <div className="size-1 rounded-full bg-current opacity-40" /> : null)}
            </div>
          )
        })}
      </div>

      {streak.track_time && thisWeekMinutes > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-black/45 dark:text-white/45">
          <Clock className="size-3.5" />
          {formatMinutes(thisWeekMinutes)} this week
        </div>
      )}
      {periodGoal && (
        <div className="mt-1 text-[11px] text-black/35 dark:text-white/35">
          {formatMinutes(stats.totalMinutes)} logged total
        </div>
      )}
    </Link>
  )
}
