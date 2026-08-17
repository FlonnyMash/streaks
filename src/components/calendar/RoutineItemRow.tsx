import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { ParticleBurst } from '@/components/streaks/ParticleBurst'
import { hapticTick, hapticUndo } from '@/lib/haptics'
import { ROUTINE_ACCENT } from '@/lib/routineLogic'
import { cn, formatMinutes } from '@/lib/utils'
import type { CalendarRoutineItem } from '@/lib/types'

interface RoutineItemRowProps {
  item: CalendarRoutineItem
  completed: boolean
  onToggle: (completed: boolean) => void
}

/** One Morning/Afternoon/Evening routine row on the calendar day view — emoji, title, and a per-day check. */
export function RoutineItemRow({ item, completed, onToggle }: RoutineItemRowProps) {
  const [showBurst, setShowBurst] = useState(false)
  const accent = ROUTINE_ACCENT[item.block]

  function handleToggleClick() {
    const next = !completed
    if (next) {
      hapticTick()
      setShowBurst(true)
    } else {
      hapticUndo()
    }
    onToggle(next)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <button
        type="button"
        onClick={handleToggleClick}
        aria-label={completed ? 'Mark as not done' : 'Mark as done'}
        className={cn(
          'relative shrink-0 size-6 rounded-full flex items-center justify-center transition-all active:scale-90 border-2',
          completed
            ? 'bg-accent-blue border-accent-blue text-white'
            : 'border-black/20 dark:border-white/25 hover:border-accent-blue',
        )}
      >
        <AnimatePresence>
          {completed && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="size-3.5" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
        {showBurst && <ParticleBurst color={accent.hex} onComplete={() => setShowBurst(false)} />}
      </button>

      <span className="text-lg leading-none shrink-0">{item.emoji}</span>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[15px] font-medium truncate transition-colors',
            completed && 'line-through text-black/35 dark:text-white/35',
          )}
        >
          {item.title}
        </p>
      </div>

      {item.estimated_minutes != null && (
        <span
          className={cn(
            'text-[11px] font-medium shrink-0',
            completed ? 'text-black/25 dark:text-white/25' : 'text-black/45 dark:text-white/45',
          )}
        >
          ~{formatMinutes(item.estimated_minutes)}
        </span>
      )}
    </motion.div>
  )
}
