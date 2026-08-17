import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { ParticleBurst } from '@/components/streaks/ParticleBurst'
import { hapticMilestone } from '@/lib/haptics'
import { cn } from '@/lib/utils'

interface SampleTaskTrialProps {
  label: string
  emoji: string
  onDone: () => void
}

const AUTO_ADVANCE_MS = 1300

/** Interactive onboarding step: checking off a sample task fires a burst + haptic + praise. */
export function SampleTaskTrial({ label, emoji, onDone }: SampleTaskTrialProps) {
  const [checked, setChecked] = useState(false)
  const [showBurst, setShowBurst] = useState(false)

  function handleCheck() {
    if (checked) return
    setChecked(true)
    hapticMilestone()
    setShowBurst(true)
    window.setTimeout(onDone, AUTO_ADVANCE_MS)
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-black/60 dark:text-white/60 text-[15px] max-w-xs">
        Try it — tap the task below to check it off and see what happens.
      </p>

      <div className="glass-panel rounded-[24px] px-5 py-4 flex items-center gap-4 w-full max-w-xs">
        <button
          type="button"
          onClick={handleCheck}
          aria-label={checked ? 'Completed' : 'Mark as done'}
          className={cn(
            'relative shrink-0 size-9 rounded-full flex items-center justify-center transition-all active:scale-90 border-2',
            checked
              ? 'bg-accent-blue border-accent-blue text-white'
              : 'border-black/20 dark:border-white/25 hover:border-accent-blue',
          )}
        >
          <AnimatePresence>
            {checked && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="size-4" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
          {showBurst && <ParticleBurst color="#0a84ff" onComplete={() => setShowBurst(false)} />}
        </button>

        <div className="flex items-center gap-2 text-left min-w-0">
          <span className="text-xl shrink-0">{emoji}</span>
          <span
            className={cn(
              'text-[15px] font-medium truncate transition-colors',
              checked && 'line-through text-black/35 dark:text-white/35',
            )}
          >
            {label}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {checked && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[14px] font-semibold text-accent-green"
          >
            Nice! That's your first win.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
