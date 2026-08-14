import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { useStreaks } from '@/hooks/useStreaks'
import { useAllStreakEntries } from '@/hooks/useStreakEntries'
import { StreakCard } from '@/components/streaks/StreakCard'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreateStreakModal } from '@/components/streaks/CreateStreakModal'
import {
  FeatureGetStartedButton,
  FeatureHelpIconButton,
  FeatureHelpModal,
} from '@/components/ui/FeatureHelp'

export function DashboardPage() {
  const { data: streaks, isLoading } = useStreaks()
  const streakIds = streaks?.map((s) => s.id) ?? []
  const { data: entries } = useAllStreakEntries(streakIds)
  const [createOpen, setCreateOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const entriesByStreak = (streakId: string) => entries?.filter((e) => e.streak_id === streakId) ?? []
  const isEmpty = !isLoading && streaks?.length === 0
  const showHelpIcon = Boolean(streaks && streaks.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">Your Streaks</h1>
            {showHelpIcon && <FeatureHelpIconButton onClick={() => setHelpOpen(true)} className="app-desktop:hidden" />}
          </div>
          <p className="text-black/50 dark:text-white/50 text-[15px] mt-0.5">Keep the fire going.</p>
        </div>
        <div className="hidden app-desktop:flex items-center gap-2">
          {showHelpIcon && <FeatureHelpIconButton onClick={() => setHelpOpen(true)} />}
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Streak
          </Button>
        </div>
      </div>

      {isLoading && <Spinner />}

      {isEmpty && (
        <div className="glass-panel rounded-[28px] p-4 mt-6">
          <EmptyState
            className="py-10"
            icon={<Sparkles className="size-8" />}
            iconClassName="text-accent-orange"
            title="No streaks yet"
            body="Create your first streak to start tracking a daily habit, custom days, or a weekly goal."
          >
            <Button type="button" className="mt-2" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create a streak
            </Button>
            <FeatureGetStartedButton onClick={() => setHelpOpen(true)} />
          </EmptyState>
        </div>
      )}

      {!isLoading && streaks && streaks.length > 0 && (
        <div className="grid grid-cols-1 app-desktop:grid-cols-2 lg:grid-cols-3 gap-4">
          {streaks.map((streak) => (
            <StreakCard key={streak.id} streak={streak} entries={entriesByStreak(streak.id)} />
          ))}
        </div>
      )}

      <button
        onClick={() => setCreateOpen(true)}
        aria-label="New streak"
        className="app-desktop:hidden fixed right-5 fab-above-tabbar z-40 size-14 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-[0_4px_12px_-6px_rgba(10,132,255,0.35)] active:scale-90 transition-transform"
      >
        <Plus className="size-6" />
      </button>

      <CreateStreakModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <FeatureHelpModal feature="streaks" open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
