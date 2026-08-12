import { Flame, Trophy, TrendingUp } from 'lucide-react'
import type { Streak, StreakEntry } from '@/lib/types'
import { computeStreakStats } from '@/lib/streakLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'

export function StreakStats({ streak, entries }: { streak: Streak; entries: StreakEntry[] }) {
  const stats = computeStreakStats(streak, entries)
  const accent = ACCENT_COLOR_MAP[streak.color]

  const items = [
    { label: 'Current', value: stats.currentStreak, icon: Flame, color: accent.hex },
    { label: 'Best', value: stats.longestStreak, icon: Trophy, color: '#ffd60a' },
    { label: 'Success', value: `${Math.round(stats.completionRate * 100)}%`, icon: TrendingUp, color: '#30d158' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="glass-panel rounded-2xl p-3.5 flex flex-col items-center gap-1">
          <Icon className="size-5" style={{ color }} fill={color} fillOpacity={0.2} />
          <span className="text-xl font-bold tabular-nums tracking-tight">{value}</span>
          <span className="text-[11px] font-medium text-black/45 dark:text-white/45">{label}</span>
        </div>
      ))}
    </div>
  )
}
