import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Frown, Meh, Smile } from 'lucide-react'
import { format } from 'date-fns'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { ParticleBurst } from '@/components/streaks/ParticleBurst'
import { hapticTick, hapticUndo } from '@/lib/haptics'
import { cn, fromDateKey } from '@/lib/utils'
import type { Mood, Streak, StreakEntry } from '@/lib/types'

const MOOD_OPTIONS: Array<{ value: Mood; icon: typeof Frown; label: string }> = [
  { value: 1, icon: Frown, label: 'Rough' },
  { value: 2, icon: Meh, label: 'Okay' },
  { value: 3, icon: Smile, label: 'Great' },
]

const NOTE_MAX = 500

interface DayDetailModalProps {
  open: boolean
  onClose: () => void
  streak: Streak
  dateKey: string | null
  entry: StreakEntry | undefined
  isFuture: boolean
  isScheduled: boolean
  accentHex: string
  isToggling: boolean
  onToggle: (dateKey: string, completed: boolean) => void
  onSaveDetails: (dateKey: string, note: string | null, mood: Mood | null) => void
}

export function DayDetailModal({
  open,
  onClose,
  streak,
  dateKey,
  entry,
  isFuture,
  isScheduled,
  accentHex,
  isToggling,
  onToggle,
  onSaveDetails,
}: DayDetailModalProps) {
  const completed = entry?.completed ?? false
  const [note, setNote] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [showBurst, setShowBurst] = useState(false)
  const initial = useRef<{ note: string; mood: Mood | null }>({ note: '', mood: null })

  useEffect(() => {
    if (!open) return
    const nextNote = entry?.note ?? ''
    const nextMood = entry?.mood ?? null
    setNote(nextNote)
    setMood(nextMood)
    initial.current = { note: nextNote, mood: nextMood }
    // Intentionally re-syncs only when the sheet opens for a (possibly new) day, not on every
    // entry mutation — otherwise completing/uncompleting mid-edit would clobber the draft.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dateKey])

  if (!dateKey) return null

  const disabled = isFuture || (!isScheduled && !completed)
  const isDirty = note !== initial.current.note || mood !== initial.current.mood

  function persistIfDirty() {
    if (!dateKey || !isDirty) return
    onSaveDetails(dateKey, note.trim() ? note.trim() : null, mood)
  }

  function handleClose() {
    persistIfDirty()
    onClose()
  }

  function handleToggleClick() {
    if (!dateKey || disabled || isToggling) return
    if (!completed) {
      hapticTick()
      setShowBurst(true)
      onToggle(dateKey, true)
    } else {
      hapticUndo()
      onToggle(dateKey, false)
    }
  }

  return (
    <GlassModal open={open} onClose={handleClose} title={format(fromDateKey(dateKey), 'EEEE, MMM d')}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <motion.button
            onClick={handleToggleClick}
            disabled={disabled || isToggling}
            whileTap={disabled ? undefined : { scale: 0.9 }}
            animate={completed ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={cn(
              'relative size-24 rounded-full flex items-center justify-center transition-colors',
              disabled && 'opacity-40 cursor-default',
            )}
            style={{
              backgroundColor: completed ? accentHex : `${accentHex}14`,
              boxShadow: completed ? `0 12px 28px -8px ${accentHex}88` : undefined,
            }}
          >
            <AnimatePresence mode="wait">
              {completed ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                >
                  <Check className="size-10 text-white" strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.span
                  key="date"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="text-2xl font-bold"
                  style={{ color: accentHex }}
                >
                  {fromDateKey(dateKey).getDate()}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          {showBurst && completed && <ParticleBurst color={accentHex} onComplete={() => setShowBurst(false)} />}
        </div>

        <p className="text-[13px] text-black/50 dark:text-white/50 text-center -mt-1">
          {disabled
            ? isFuture
              ? "You can't mark future days yet."
              : 'Not a scheduled day for this streak.'
            : completed
              ? 'Tap to unmark this day.'
              : 'Tap to mark this day complete.'}
        </p>

        {completed && entry?.note && (
          <p className="text-[12px] text-accent-orange text-center -mt-2">Unmarking this day removes your note.</p>
        )}

        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full flex flex-col gap-4 overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">
                  How did it feel?
                </span>
                <div className="flex items-center justify-center gap-3">
                  {MOOD_OPTIONS.map(({ value, icon: Icon, label }) => {
                    const selected = mood === value
                    return (
                      <motion.button
                        key={value}
                        type="button"
                        onClick={() => setMood(selected ? null : value)}
                        whileTap={{ scale: 0.88 }}
                        animate={{ scale: selected ? 1.08 : 1 }}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05]"
                        aria-label={label}
                        aria-pressed={selected}
                      >
                        <Icon className="size-6" strokeWidth={2} style={{ opacity: selected ? 1 : 0.4 }} />
                        <span className="text-[11px] font-medium" style={{ opacity: selected ? 1 : 0.4 }}>
                          {label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Note</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                  placeholder={`What happened with ${streak.name.toLowerCase()} today?`}
                  rows={3}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-[15px] outline-none transition-all resize-none',
                    'bg-black/[0.04] dark:bg-white/[0.06]',
                    'border border-black/[0.06] dark:border-white/[0.08]',
                    'placeholder:text-black/30 dark:placeholder:text-white/30',
                    'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
                  )}
                />
                <span className="text-[11px] text-black/35 dark:text-white/35 text-right px-0.5">
                  {note.length}/{NOTE_MAX}
                </span>
              </label>

              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  persistIfDirty()
                  onClose()
                }}
                className="w-full"
              >
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassModal>
  )
}
