import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_QUICK_PRESETS,
  addMinutesToClock,
  addQuickPreset,
  durationFromRange,
  formatClockTime,
  normalizeQuickPresets,
  removeQuickPreset,
  toTimeInputValue,
} from '@/lib/timesheetLogic'
import { cn, formatMinutes, fromDateKey } from '@/lib/utils'
import type { TimesheetEntry, TimesheetEntryInput } from '@/lib/types'

const MINUTES_STEP = 15
const MAX_MINUTES = 24 * 60

interface DayEntriesModalProps {
  open: boolean
  onClose: () => void
  dateKey: string | null
  entries: TimesheetEntry[]
  accentHex: string
  isSaving: boolean
  quickPresets?: number[]
  onPresetsChange?: (presets: number[]) => void
  onAdd: (input: Omit<TimesheetEntryInput, 'entry_date'>) => void
  onDelete: (id: string) => void
}

interface Draft {
  minutes: number
  startTime: string
  endTime: string
  topic: string
  note: string
}

function defaultDraft(): Draft {
  return { minutes: 30, startTime: '', endTime: '', topic: '', note: '' }
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return MINUTES_STEP
  return Math.min(MAX_MINUTES, Math.max(1, Math.round(value)))
}

const inputClass = cn(
  'h-11 rounded-2xl px-4 text-[15px] outline-none transition-all',
  'bg-black/[0.04] dark:bg-white/[0.06]',
  'border border-black/[0.06] dark:border-white/[0.08]',
  'placeholder:text-black/30 dark:placeholder:text-white/30',
  'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
)

const timeInputClass = cn(
  'h-11 flex-1 min-w-0 rounded-2xl px-3 text-[15px] font-semibold tabular-nums outline-none transition-all',
  'bg-black/[0.04] dark:bg-white/[0.06]',
  'border border-black/[0.06] dark:border-white/[0.08]',
  'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
)

export function DayEntriesModal({
  open,
  onClose,
  dateKey,
  entries,
  accentHex,
  isSaving,
  quickPresets,
  onPresetsChange,
  onAdd,
  onDelete,
}: DayEntriesModalProps) {
  const [draft, setDraft] = useState(() => defaultDraft())
  const [hoursText, setHoursText] = useState('0')
  const [minutesText, setMinutesText] = useState('30')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const presets = normalizeQuickPresets(quickPresets ?? DEFAULT_QUICK_PRESETS)
  const canManagePresets = Boolean(onPresetsChange)
  const currentIsPreset = presets.includes(draft.minutes)
  const hasRange = Boolean(draft.startTime && draft.endTime)

  function syncDurationFields(total: number) {
    const clamped = clampMinutes(total)
    setHoursText(String(Math.floor(clamped / 60)))
    setMinutesText(String(clamped % 60))
    return clamped
  }

  useEffect(() => {
    if (!open) return
    const next = defaultDraft()
    setDraft(next)
    syncDurationFields(next.minutes)
    setRangeError(null)
  }, [open, dateKey])

  if (!dateKey) return null

  const total = entries.reduce((sum, e) => sum + e.minutes, 0)

  function applyRange(startTime: string, endTime: string) {
    if (!startTime || !endTime) {
      setDraft((d) => ({ ...d, startTime, endTime }))
      setRangeError(null)
      return
    }
    const duration = durationFromRange(startTime, endTime)
    if (duration == null) {
      setDraft((d) => ({ ...d, startTime, endTime }))
      setRangeError('End time must be after start time.')
      return
    }
    setRangeError(null)
    syncDurationFields(duration)
    setDraft((d) => ({ ...d, startTime, endTime, minutes: duration }))
  }

  function setMinutes(totalMinutes: number) {
    const clamped = syncDurationFields(totalMinutes)
    setRangeError(null)
    setDraft((d) => {
      if (!d.startTime) {
        return { ...d, minutes: clamped, endTime: '' }
      }
      const endTime = addMinutesToClock(d.startTime, clamped) ?? ''
      return { ...d, minutes: clamped, endTime }
    })
    return clamped
  }

  /** Reads the live hour/minute fields so Add works even if the inputs never blurred. */
  function resolveDurationFromInputs(hoursRaw = hoursText, minutesRaw = minutesText): number {
    let hours = Math.max(0, Math.min(24, Number.parseInt(hoursRaw, 10) || 0))
    let mins = Math.max(0, Math.min(59, Number.parseInt(minutesRaw, 10) || 0))
    // 24h is only valid as exactly one day — drop leftover minutes instead of overflowing.
    if (hours === 24) mins = 0
    const totalMinutes = hours * 60 + mins
    return clampMinutes(totalMinutes > 0 ? totalMinutes : MINUTES_STEP)
  }

  function commitHours(raw: string) {
    setMinutes(resolveDurationFromInputs(raw, minutesText))
  }

  function commitMinutesPart(raw: string) {
    setMinutes(resolveDurationFromInputs(hoursText, raw))
  }

  function handleAdd() {
    const minutes = resolveDurationFromInputs()
    const startTime = draft.startTime
    const endTime = startTime ? (addMinutesToClock(startTime, minutes) ?? '') : draft.endTime

    if ((startTime && !endTime) || (!startTime && endTime)) {
      setRangeError('Set both start and end time, or leave both empty.')
      return
    }
    if (startTime && endTime && durationFromRange(startTime, endTime) == null) {
      setRangeError('End time must be after start time.')
      return
    }
    if (minutes <= 0) return

    // Keep draft/duration fields in sync with what we're about to save.
    setMinutes(minutes)

    onAdd({
      minutes,
      start_time: startTime ? toTimeInputValue(startTime) : null,
      end_time: endTime ? toTimeInputValue(endTime) : null,
      topic: draft.topic.trim() ? draft.topic.trim() : null,
      note: draft.note.trim() ? draft.note.trim() : null,
    })
    const next = defaultDraft()
    setDraft(next)
    syncDurationFields(next.minutes)
    setRangeError(null)
  }

  return (
    <GlassModal open={open} onClose={onClose} title={format(fromDateKey(dateKey), 'EEEE, MMM d')}>
      <div className="flex flex-col gap-5">
        {total > 0 && (
          <p className="text-center text-[13px] text-black/50 dark:text-white/50 -mt-1">
            <span className="font-semibold" style={{ color: accentHex }}>
              {formatMinutes(total)}
            </span>{' '}
            logged this day
          </p>
        )}

        {entries.length > 0 && (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {entries.map((entry) => {
                const startLabel = formatClockTime(entry.start_time)
                const endLabel = formatClockTime(entry.end_time)
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3"
                  >
                    <div
                      className="shrink-0 size-9 rounded-xl flex items-center justify-center text-[12px] font-bold tabular-nums text-white"
                      style={{ backgroundColor: accentHex }}
                    >
                      {formatMinutes(entry.minutes)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{entry.topic || 'Time logged'}</p>
                      {startLabel && endLabel && (
                        <p className="text-[12px] font-medium tabular-nums text-black/55 dark:text-white/55">
                          {startLabel} – {endLabel}
                        </p>
                      )}
                      {entry.note && (
                        <p className="text-[12px] text-black/45 dark:text-white/45 truncate">{entry.note}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id)}
                      aria-label="Delete entry"
                      className="shrink-0 size-8 rounded-full flex items-center justify-center text-black/30 dark:text-white/30 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5 pt-3">Log time</span>

          <div className="flex items-center gap-2">
            <label className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-black/45 dark:text-white/45 px-0.5">From</span>
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => applyRange(e.target.value, draft.endTime)}
                className={timeInputClass}
              />
            </label>
            <span className="text-black/30 dark:text-white/30 pt-5">→</span>
            <label className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-black/45 dark:text-white/45 px-0.5">Until</span>
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) => applyRange(draft.startTime, e.target.value)}
                className={timeInputClass}
              />
            </label>
          </div>

          {rangeError && <p className="text-[12px] text-accent-red text-center -mt-1">{rangeError}</p>}

          <div className="flex items-center justify-center gap-3 glass-panel rounded-2xl py-3 px-3">
            <button
              type="button"
              onClick={() => setMinutes(draft.minutes - MINUTES_STEP)}
              className="size-9 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
            >
              <Minus className="size-4" />
            </button>

            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={24}
                  value={hoursText}
                  onChange={(e) => setHoursText(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  onBlur={() => commitHours(hoursText)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                  aria-label="Hours"
                  className="w-12 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-center text-xl font-bold tabular-nums outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-[13px] font-medium text-black/45 dark:text-white/45">h</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={minutesText}
                  onChange={(e) => setMinutesText(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  onBlur={() => commitMinutesPart(minutesText)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                  aria-label="Minutes"
                  className="w-12 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-center text-xl font-bold tabular-nums outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-[13px] font-medium text-black/45 dark:text-white/45">m</span>
              </div>
              {hasRange && (
                <span className="text-[11px] text-black/40 dark:text-white/40">from schedule</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMinutes(draft.minutes + MINUTES_STEP)}
              className="size-9 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {presets.map((preset) => (
              <div key={preset} className="relative group">
                <button
                  type="button"
                  onClick={() => setMinutes(preset)}
                  className={cn(
                    'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                    canManagePresets && 'pr-7',
                    draft.minutes === preset
                      ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                  )}
                >
                  {formatMinutes(preset)}
                </button>
                {canManagePresets && (
                  <button
                    type="button"
                    aria-label={`Remove ${formatMinutes(preset)} preset`}
                    onClick={() => onPresetsChange?.(removeQuickPreset(presets, preset))}
                    className="absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center bg-black/10 dark:bg-white/15 text-black/50 dark:text-white/50 hover:bg-accent-red hover:text-white transition-colors"
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
            {canManagePresets && !currentIsPreset && (
              <button
                type="button"
                onClick={() => onPresetsChange?.(addQuickPreset(presets, draft.minutes))}
                className="h-8 px-3 rounded-full text-[12px] font-medium transition-all bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/15 inline-flex items-center gap-1"
              >
                <Plus className="size-3.5" />
                Save {formatMinutes(draft.minutes)}
              </button>
            )}
          </div>

          <input
            value={draft.topic}
            onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value.slice(0, 80) }))}
            placeholder="Topic (optional) — e.g. Client call"
            className={inputClass}
          />

          <input
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value.slice(0, 500) }))}
            placeholder="Note (optional)"
            className={inputClass}
          />

          <Button onClick={handleAdd} loading={isSaving} size="lg" className="w-full">
            <Plus className="size-4" />
            Add time block
          </Button>
        </div>
      </div>
    </GlassModal>
  )
}
