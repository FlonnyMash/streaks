import { useEffect, useRef, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Clock, Flame, Trophy, TrendingUp } from 'lucide-react'
import type { Streak, StreakEntry } from '@/lib/types'
import { computeStreakStats } from '@/lib/streakLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatMinutes } from '@/lib/utils'

function AnimatedNumber({ value, className }: { value: number | string; className?: string }) {
  const numeric = typeof value === 'number' ? value : null
  const [display, setDisplay] = useState(numeric ?? 0)
  const prevRef = useRef(numeric ?? 0)

  useEffect(() => {
    if (numeric === null) return
    const from = prevRef.current
    prevRef.current = numeric
    if (from === numeric) {
      setDisplay(numeric)
      return
    }
    const controls = animate(from, numeric, {
      type: 'spring',
      stiffness: 260,
      damping: 26,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => setDisplay(numeric),
    })
    return () => controls.stop()
  }, [numeric])

  return <span className={className}>{numeric === null ? value : display}</span>
}

export function StreakStats({ streak, entries }: { streak: Streak; entries: StreakEntry[] }) {
  const stats = computeStreakStats(streak, entries)
  const accent = ACCENT_COLOR_MAP[streak.color]
  const prevCurrentRef = useRef(stats.currentStreak)
  const [flameBump, setFlameBump] = useState(0)

  useEffect(() => {
    if (stats.currentStreak > prevCurrentRef.current) {
      setFlameBump((n) => n + 1)
    }
    prevCurrentRef.current = stats.currentStreak
  }, [stats.currentStreak])

  const items = [
    { label: 'Current', value: stats.currentStreak, icon: Flame, color: accent.hex, bump: flameBump },
    { label: 'Best', value: stats.longestStreak, icon: Trophy, color: '#ffd60a', bump: 0 },
    { label: 'Success', value: `${Math.round(stats.completionRate * 100)}%`, icon: TrendingUp, color: '#30d158', bump: 0 },
    ...(streak.track_time
      ? [{ label: 'Time', value: formatMinutes(stats.totalMinutes), icon: Clock, color: '#64d2ff', bump: 0 }]
      : []),
  ]

  return (
    <div className={streak.track_time ? 'grid grid-cols-2 app-desktop:grid-cols-4 gap-3' : 'grid grid-cols-3 gap-3'}>
      {items.map(({ label, value, icon: Icon, color, bump }) => (
        <div key={label} className="glass-panel rounded-2xl p-3.5 flex flex-col items-center gap-1">
          <motion.div
            key={bump}
            initial={bump ? { scale: 1 } : false}
            animate={bump ? { scale: [1, 1.35, 1] } : {}}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <Icon className="size-5" style={{ color }} fill={color} fillOpacity={0.2} />
          </motion.div>
          <span className="text-xl font-bold tabular-nums tracking-tight">
            <AnimatedNumber value={value} />
          </span>
          <span className="text-[11px] font-medium text-black/45 dark:text-white/45">{label}</span>
        </div>
      ))}
    </div>
  )
}
