import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Flame, Sparkles } from 'lucide-react'
import { useStreaks } from '@/hooks/useStreaks'
import { useAllStreakEntries, useToggleStreakEntry } from '@/hooks/useStreakEntries'
import { isScheduledDay } from '@/lib/streakLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { toDateKey } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import type { Streak, StreakEntry } from '@/lib/types'

interface TodayStreakRowProps {
  streak: Streak
  completedToday: boolean
}

function TodayStreakRow({ streak, completedToday }: TodayStreakRowProps) {
  const toggle = useToggleStreakEntry(streak.id)
  const accent = ACCENT_COLOR_MAP[streak.color]
  const todayKey = toDateKey(new Date())

  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ dateKey: todayKey, completed: !completedToday })}
      className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 -mx-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors text-left"
    >
      <div
        className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${accent.hex}22` }}
      >
        {streak.emoji}
      </div>
      <span className={`flex-1 min-w-0 truncate font-medium text-[14px] ${completedToday ? 'line-through text-black/40 dark:text-white/40' : ''}`}>
        {streak.name}
      </span>
      {completedToday ? (
        <CheckCircle2 className="size-5 shrink-0" style={{ color: accent.hex }} fill={accent.hex} fillOpacity={0.2} />
      ) : (
        <Circle className="size-5 shrink-0 text-black/20 dark:text-white/20" />
      )}
    </button>
  )
}

export function TodayStreaksWidget() {
  const { data: streaks, isLoading: streaksLoading } = useStreaks()
  const streakIds = streaks?.map((s) => s.id) ?? []
  const { data: entries, isLoading: entriesLoading } = useAllStreakEntries(streakIds)
  // Wait for entries whenever there are streaks — otherwise `entries ?? []` briefly shows 0/N done.
  const isLoading = streaksLoading || (streakIds.length > 0 && entriesLoading)

  const today = new Date()
  const todayKey = toDateKey(today)

  const scheduledToday = (streaks ?? []).filter((s) => isScheduledDay(s, today))
  const completedTodayIds = new Set(
    (entries ?? []).filter((e: StreakEntry) => e.entry_date === todayKey && e.completed).map((e) => e.streak_id),
  )
  const doneCount = scheduledToday.filter((s) => completedTodayIds.has(s.id)).length

  return (
    <div className="glass-panel rounded-[24px] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-accent-orange" />
          <h2 className="font-semibold text-[15px]">Today's Streaks</h2>
        </div>
        {!isLoading && scheduledToday.length > 0 && (
          <span className="text-[13px] font-medium text-black/45 dark:text-white/45 tabular-nums">
            {doneCount}/{scheduledToday.length}
          </span>
        )}
      </div>

      {isLoading && <Spinner className="size-5" />}

      {!isLoading && scheduledToday.length === 0 && (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <Sparkles className="size-6 text-accent-orange/70" />
          <p className="text-[13px] text-black/45 dark:text-white/45">Nothing scheduled today. Enjoy the day off!</p>
        </div>
      )}

      {!isLoading && scheduledToday.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {scheduledToday.map((streak) => (
            <TodayStreakRow key={streak.id} streak={streak} completedToday={completedTodayIds.has(streak.id)} />
          ))}
        </div>
      )}

      <Link
        to="/streaks"
        className="mt-3 inline-flex text-[13px] font-medium text-accent-blue hover:brightness-110 transition-all"
      >
        View all streaks →
      </Link>
    </div>
  )
}
