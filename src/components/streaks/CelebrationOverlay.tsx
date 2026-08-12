import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame } from 'lucide-react'

interface CelebrationOverlayProps {
  open: boolean
  milestone: number
  color: string
  onDismiss: () => void
}

const CONFETTI_COUNT = 40
const AUTO_DISMISS_MS = 2500

interface ConfettiPiece {
  id: number
  left: number
  delay: number
  duration: number
  drift: number
  rotate: number
  size: number
}

/** Full-screen confetti + milestone badge, shown briefly when a streak hits a round number. */
export function CelebrationOverlay({ open, milestone, color, onDismiss }: CelebrationOverlayProps) {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1.4 + Math.random() * 1,
      drift: (Math.random() - 0.5) * 120,
      rotate: 180 + Math.random() * 540,
      size: 6 + Math.random() * 6,
    }))
    // This component stays mounted across celebrations (only its `open` prop toggles), so the
    // pattern must be regenerated on every open, not just once for the component's lifetime.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [open, onDismiss])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute top-0 rounded-sm"
              style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.4, backgroundColor: color }}
              initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
              animate={{ y: '110vh', x: p.drift, opacity: [1, 1, 0], rotate: p.rotate }}
              transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
            />
          ))}

          <motion.div
            className="pointer-events-auto glass-panel rounded-[28px] px-7 py-6 flex flex-col items-center gap-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.4)]"
            initial={{ opacity: 0, scale: 0.7, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 240, delay: 0.1 }}
            >
              <Flame className="size-10" style={{ color }} fill={color} fillOpacity={0.3} />
            </motion.div>
            <span className="text-xl font-bold tracking-tight">{milestone}-day streak!</span>
            <span className="text-[13px] text-black/50 dark:text-white/50">Tap anywhere to dismiss</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
