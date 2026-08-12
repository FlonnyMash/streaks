import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Frown, Meh, Minus, Plus, Smile } from 'lucide-react'
import { format } from 'date-fns'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { ParticleBurst } from '@/components/streaks/ParticleBurst'
import { hapticTick, hapticUndo } from '@/lib/haptics'
import { cn, formatMinutes, fromDateKey } from '@/lib/utils'
import { hasDayTimeGoal, hasPeriodTimeGoal } from '@/lib/streakLogic'
import type { Mood, Streak, StreakEntry } from '@/lib/types'

const MOOD_OPTIONS: Array<{ value: Mood; icon: typeof Frown; label: string }> = [
  { value: 1, icon: Frown, label: 'Rough' },
  { value: 2, icon: Meh, label: 'Okay' },
  { value: 3, icon: Smile, label: 'Great' },
]

const NOTE_MAX = 500
const MINUTES_STEP = 5
const MINUTE_PRESETS = [15, 30, 60]

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
  onLogMinutes: (dateKey: string, minutes: number, completed: boolean) => void
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
  onLogMinutes,
}: DayDetailModalProps) {
  const dayGoal = hasDayTimeGoal(streak)
  const periodGoal = hasPeriodTimeGoal(streak)
  const goalDriven = dayGoal || periodGoal
  const goalMinutes = streak.time_goal_minutes ?? 0

  const [minutes, setMinutes] = useState(entry?.minutes ?? 0)
  const [note, setNote] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [showBurst, setShowBurst] = useState(false)
  const initial = useRef<{ note: string; mood: Mood | null }>({ note: '', mood: null })
  const prevDayGoalMet = useRef(false)

  // Day goals auto-complete from minutes. Period goals never mark individual days complete —
  // only the week/month total matters for streak math. Optional track_time keeps the checkbox.
  const completed = dayGoal ? minutes >= goalMinutes : (entry?.completed ?? false)
  // Period-goal notes unlock once any time is logged for the day (not via `completed`).
  const showDetails = dayGoal ? completed : periodGoal ? minutes > 0 : completed

  useEffect(() => {
    if (!open) return
    const nextNote = entry?.note ?? ''
    const nextMood = entry?.mood ?? null
    const nextMinutes = entry?.minutes ?? 0
    setNote(nextNote)
    setMood(nextMood)
    setMinutes(nextMinutes)
    initial.current = { note: nextNote, mood: nextMood }
    prevDayGoalMet.current = dayGoal ? nextMinutes >= goalMinutes : (entry?.completed ?? false)
    // Intentionally omits `entry` so completing/uncompleting mid-edit doesn't clobber the draft.
    // dayGoal / goalMinutes are included so a streak edit that changes the goal while this sheet
    // is open still refreshes haptic baseline state.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dateKey, dayGoal, goalMinutes])

  if (!dateKey) return null

  const disabled = isFuture || (!isScheduled && !completed && !periodGoal)
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
    if (!dateKey || disabled || isToggling || goalDriven) return
    if (!completed) {
      hapticTick()
      setShowBurst(true)
      onToggle(dateKey, true)
    } else {
      hapticUndo()
      onToggle(dateKey, false)
    }
  }

  function handleMinutesChange(next: number) {
    if (!dateKey || disabled) return
    const clamped = Math.max(0, next)
    setMinutes(clamped)
    // Period goals: keep `completed` false so per-day flags don't pollute streak/calendar UI.
    const nextCompleted = dayGoal ? clamped >= goalMinutes : periodGoal ? false : (entry?.completed ?? false)
    if (dayGoal) {
      if (nextCompleted && !prevDayGoalMet.current) {
        hapticTick()
        setShowBurst(true)
      } else if (!nextCompleted && prevDayGoalMet.current) {
        hapticUndo()
      }
      prevDayGoalMet.current = nextCompleted
    }
    onLogMinutes(dateKey, clamped, nextCompleted)
  }

  return (
    <GlassModal open={open} onClose={handleClose} title={format(fromDateKey(dateKey), 'EEEE, MMM d')}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          {goalDriven ? (
            <div
              className="relative size-24 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: completed ? accentHex : `${accentHex}14`,
                boxShadow: completed ? `0 12px 28px -8px ${accentHex}88` : undefined,
              }}
            >
              {dayGoal && (
                <svg className="absolute inset-0 size-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="44" fill="none" stroke={`${accentHex}33`} strokeWidth="4" />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke={accentHex}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(1, minutes / Math.max(1, goalMinutes)))}
                  />
                </svg>
              )}
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
                    key="minutes"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    className="text-lg font-bold tabular-nums"
                    style={{ color: accentHex }}
                  >
                    {minutes}m
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ) : (
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
          )}
          {showBurst && completed && <ParticleBurst color={accentHex} onComplete={() => setShowBurst(false)} />}
        </div>

        <p className="text-[13px] text-black/50 dark:text-white/50 text-center -mt-1">
          {isFuture
            ? "You can't log future days yet."
            : dayGoal
              ? completed
                ? `Goal met — ${formatMinutes(minutes)} of ${formatMinutes(goalMinutes)}.`
                : `${formatMinutes(minutes)} of ${formatMinutes(goalMinutes)} logged today.`
              : periodGoal
                ? `${formatMinutes(minutes)} logged today toward this ${streak.time_goal_period}'s ${formatMinutes(goalMinutes)} goal.`
                : !isScheduled && !completed
                  ? 'Not a scheduled day for this streak.'
                  : completed
                    ? 'Tap to unmark this day.'
                    : 'Tap to mark this day complete.'}
        </p>

        {streak.track_time && !isFuture && (
          <div className="w-full flex flex-col gap-2">
            <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5 text-center">
              {goalDriven ? 'Log time' : 'Time logged (optional)'}
            </span>
            <div className="flex items-center justify-center gap-4 glass-panel rounded-2xl py-3">
              <button
                type="button"
                onClick={() => handleMinutesChange(minutes - MINUTES_STEP)}
                disabled={disabled}
                className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="text-xl font-bold w-20 text-center tabular-nums">{formatMinutes(minutes)}</span>
              <button
                type="button"
                onClick={() => handleMinutesChange(minutes + MINUTES_STEP)}
                disabled={disabled}
                className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {MINUTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleMinutesChange(preset)}
                  className={cn(
                    'h-8 px-3 rounded-full text-[12px] font-medium transition-all disabled:opacity-40',
                    minutes === preset
                      ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                  )}
                >
                  {formatMinutes(preset)}
                </button>
              ))}
              {minutes !== 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleMinutesChange(0)}
                  className="h-8 px-3 rounded-full text-[12px] font-medium transition-all disabled:opacity-40 bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {completed && entry?.note && !goalDriven && (
          <p className="text-[12px] text-accent-orange text-center -mt-2">Unmarking this day removes your note.</p>
        )}

        <AnimatePresence>
          {showDetails && (
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
