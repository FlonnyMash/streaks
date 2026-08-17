import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'

interface ConfettiPiece {
  id: number
  left: number
  delay: number
  duration: number
  drift: number
  rotate: number
  size: number
}

const CONFETTI_COUNT = 22
const CONFETTI_COLORS = ['#ff9f0a', '#ff453a', '#ffd60a', '#0a84ff']

/** Milestone/progress screen shown after the sample task trial: "Ignition — your first milestone". */
export function MilestoneUnlock() {
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.2 + Math.random() * 0.8,
        drift: (Math.random() - 0.5) * 80,
        rotate: 180 + Math.random() * 540,
        size: 5 + Math.random() * 5,
      })),
    [],
  )

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative w-full h-28 flex items-center justify-center overflow-hidden">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute top-0 rounded-sm"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.4,
              backgroundColor: CONFETTI_COLORS[p.id % CONFETTI_COLORS.length],
            }}
            initial={{ y: -10, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: 120, x: p.drift, opacity: [1, 1, 0], rotate: p.rotate }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          />
        ))}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 220, delay: 0.15 }}
          className="relative size-24 rounded-full bg-gradient-to-br from-accent-orange to-accent-red flex items-center justify-center shadow-[0_16px_40px_-10px_rgba(255,69,58,0.5)]"
        >
          <Flame className="size-11 text-white" fill="white" fillOpacity={0.25} />
        </motion.div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ignition</h2>
        <p className="text-black/50 dark:text-white/50 text-[15px] mt-1">Your first milestone, unlocked.</p>
      </div>

      <p className="text-black/60 dark:text-white/60 text-[14px] max-w-xs leading-relaxed">
        Every streak starts with a single task, and you just finished yours. Let's keep that momentum going.
      </p>
    </div>
  )
}
