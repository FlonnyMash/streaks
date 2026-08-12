import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { useStreaks } from '@/hooks/useStreaks'
import { useAllStreakEntries } from '@/hooks/useStreakEntries'
import { StreakCard } from '@/components/streaks/StreakCard'
import { Spinner } from '@/components/ui/Spinner'
import { CreateStreakModal } from '@/components/streaks/CreateStreakModal'

export function DashboardPage() {
  const { data: streaks, isLoading } = useStreaks()
  const streakIds = streaks?.map((s) => s.id) ?? []
  const { data: entries } = useAllStreakEntries(streakIds)
  const [createOpen, setCreateOpen] = useState(false)

  const entriesByStreak = (streakId: string) => entries?.filter((e) => e.streak_id === streakId) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">Your Streaks</h1>
          <p className="text-black/50 dark:text-white/50 text-[15px] mt-0.5">Keep the fire going.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-accent-blue text-white font-medium shadow-[0_8px_20px_-6px_rgba(10,132,255,0.6)] hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="size-4" />
          New Streak
        </button>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && streaks?.length === 0 && (
        <div className="glass-panel rounded-[28px] p-10 flex flex-col items-center text-center gap-3 mt-6">
          <Sparkles className="size-8 text-accent-orange" />
          <h2 className="font-semibold text-lg">No streaks yet</h2>
          <p className="text-black/50 dark:text-white/50 text-[15px] max-w-xs">
            Create your first streak to start tracking a daily habit, custom days, or a weekly goal.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-2 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-accent-blue text-white font-medium active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            Create a streak
          </button>
        </div>
      )}

      {!isLoading && streaks && streaks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streaks.map((streak) => (
            <StreakCard key={streak.id} streak={streak} entries={entriesByStreak(streak.id)} />
          ))}
        </div>
      )}

      <button
        onClick={() => setCreateOpen(true)}
        aria-label="New streak"
        className="sm:hidden fixed right-5 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40 size-14 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(10,132,255,0.7)] active:scale-90 transition-transform"
      >
        <Plus className="size-6" />
      </button>

      <CreateStreakModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
