import { Flame, TrendingUp, Trophy } from 'lucide-react'
import { useStreaks } from '@/hooks/useStreaks'
import { useAllStreakEntries } from '@/hooks/useStreakEntries'
import { computeStreakStats } from '@/lib/streakLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

export function StreakHighlightsWidget() {
  const { data: streaks, isLoading: streaksLoading } = useStreaks()
  const streakIds = streaks?.map((s) => s.id) ?? []
  const { data: entries, isLoading: entriesLoading } = useAllStreakEntries(streakIds)
  // Wait for entries whenever there are streaks — otherwise stats briefly compute against [].
  const isLoading = streaksLoading || (streakIds.length > 0 && entriesLoading)

  if (isLoading) {
    return (
      <div className="glass-panel rounded-[24px] p-5 flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0">
          <Spinner className="size-5" />
        </div>
      </div>
    )
  }

  if (!streaks || streaks.length === 0) {
    return (
      <div className="glass-panel rounded-[24px] p-5 flex flex-col h-full min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="size-4 text-accent-blue" />
          <h2 className="font-semibold text-[15px]">Streak Highlights</h2>
        </div>
        <EmptyState
          icon={<TrendingUp className="size-6" />}
          iconClassName="text-accent-blue"
          body="Create your first streak to start building momentum."
        />
      </div>
    )
  }

  const withStats = streaks.map((streak) => ({
    streak,
    stats: computeStreakStats(streak, (entries ?? []).filter((e) => e.streak_id === streak.id)),
  }))

  const totalCurrentDays = withStats.reduce((sum, s) => sum + s.stats.currentStreak, 0)
  const best = withStats.reduce((top, s) => (s.stats.currentStreak > (top?.stats.currentStreak ?? -1) ? s : top), withStats[0])
  const bestAccent = ACCENT_COLOR_MAP[best.streak.color]

  return (
    <div className="glass-panel rounded-[24px] p-5 flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="size-4 text-accent-blue" />
        <h2 className="font-semibold text-[15px]">Streak Highlights</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-inset rounded-2xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-black/45 dark:text-white/45 mb-1">Active</p>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight">{streaks.length}</p>
        </div>
        <div className="glass-inset rounded-2xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-black/45 dark:text-white/45 mb-1">Combined days</p>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight">{totalCurrentDays}</p>
        </div>
      </div>

      {best.stats.currentStreak > 0 && (
        <div className="glass-inset relative overflow-hidden flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `${bestAccent.hex}14` }} />
          <Trophy className="size-5 shrink-0" style={{ color: bestAccent.hex }} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">{best.streak.name}</p>
            <p className="text-[12px] text-black/45 dark:text-white/45">Your best streak right now</p>
          </div>
          <div className="flex items-center gap-1 shrink-0" style={{ color: bestAccent.hex }}>
            <Flame className="size-4" fill="currentColor" fillOpacity={0.25} />
            <span className="font-extrabold tabular-nums">{best.stats.currentStreak}</span>
          </div>
        </div>
      )}
    </div>
  )
}
