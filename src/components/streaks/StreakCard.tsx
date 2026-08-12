import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import type { Streak, StreakEntry } from '@/lib/types'
import { computeStreakStats, isScheduledDay } from '@/lib/streakLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { toDateKey } from '@/lib/utils'
import { addDays, startOfDay } from 'date-fns'

interface StreakCardProps {
  streak: Streak
  entries: StreakEntry[]
}

export function StreakCard({ streak, entries }: StreakCardProps) {
  const stats = computeStreakStats(streak, entries)
  const accent = ACCENT_COLOR_MAP[streak.color]
  const completedDates = new Set(entries.filter((e) => e.completed).map((e) => e.entry_date))

  const today = startOfDay(new Date())
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

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
            <p className="text-[13px] text-black/50 dark:text-white/50">
              {streak.frequency_type === 'daily' && 'Every day'}
              {streak.frequency_type === 'weekdays' && 'Custom days'}
              {streak.frequency_type === 'times_per_week' && `${streak.target_count ?? 1}x per week`}
            </p>
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
        {last7.map((date) => {
          const key = toDateKey(date)
          const scheduled = isScheduledDay(streak, date)
          const done = completedDates.has(key)
          return (
            <div
              key={key}
              className="flex-1 h-7 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: done ? accent.hex : scheduled ? `${accent.hex}14` : 'transparent',
                opacity: scheduled ? 1 : 0.35,
              }}
            >
              {!scheduled && <div className="size-1 rounded-full bg-current opacity-40" />}
            </div>
          )
        })}
      </div>
    </Link>
  )
}
