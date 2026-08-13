import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { Check, Frown, Meh, Minus, Pause, Play, Plus, Smile, Trash2 } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { ClockInPickerModal } from '@/components/timesheet/ClockInPickerModal'
import {
  DEFAULT_QUICK_PRESETS,
  addMinutesToClock,
  durationFromRange,
  formatClockTime,
  formatElapsedClock,
  normalizeQuickPresets,
  toTimeInputValue,
} from '@/lib/timesheetLogic'
import { cn, formatMinutes, fromDateKey, toDateKey } from '@/lib/utils'
import { minutesFromSeconds } from '@/lib/todoTimerLogic'
import type { Mood, TimesheetEntry, TimesheetEntryInput } from '@/lib/types'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'

const MINUTES_STEP = 15
const MAX_MINUTES = 24 * 60

const MOOD_OPTIONS: Array<{ value: Mood; icon: typeof Frown; label: string }> = [
  { value: 1, icon: Frown, label: 'Rough' },
  { value: 2, icon: Meh, label: 'Okay' },
  { value: 3, icon: Smile, label: 'Great' },
]

function moodIcon(mood: Mood | null | undefined) {
  if (mood === 1) return Frown
  if (mood === 2) return Meh
  if (mood === 3) return Smile
  return null
}

type EntryDraftInput = Omit<TimesheetEntryInput, 'entry_date'>

interface DayEntriesModalProps {
  open: boolean
  onClose: () => void
  dateKey: string | null
  workspaceId: string
  entries: TimesheetEntry[]
  accentHex: string
  isSaving: boolean
  quickPresets?: number[]
  onAdd: (input: EntryDraftInput) => void
  onUpdate: (id: string, input: EntryDraftInput) => void
  onDelete: (id: string) => void
}

interface Draft {
  minutes: number
  startTime: string
  endTime: string
  topic: string
  note: string
  mood: Mood | null
}

function defaultDraft(): Draft {
  return { minutes: 30, startTime: '', endTime: '', topic: '', note: '', mood: null }
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
  workspaceId,
  entries,
  accentHex,
  isSaving,
  quickPresets,
  onAdd,
  onUpdate,
  onDelete,
}: DayEntriesModalProps) {
  const [draft, setDraft] = useState(() => defaultDraft())
  const [hoursText, setHoursText] = useState('0')
  const [minutesText, setMinutesText] = useState('30')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [clockInOpen, setClockInOpen] = useState(false)
  const { sessionForWorkspace, elapsedMsFor, storedSecondsFor, start, requestStop, pause, resume } =
    useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()
  const presets = normalizeQuickPresets(quickPresets ?? DEFAULT_QUICK_PRESETS)
  const hasRange = Boolean(draft.startTime && draft.endTime)
  const isEditing = editingId !== null
  const activeSession = sessionForWorkspace(workspaceId)

  function syncDurationFields(total: number) {
    const clamped = clampMinutes(total)
    setHoursText(String(Math.floor(clamped / 60)))
    setMinutesText(String(clamped % 60))
    return clamped
  }

  function resetDraft() {
    const next = defaultDraft()
    setDraft(next)
    syncDurationFields(next.minutes)
    setRangeError(null)
    setEditingId(null)
  }

  function loadEntryIntoDraft(entry: TimesheetEntry) {
    const startTime = toTimeInputValue(entry.start_time)
    const endTime = toTimeInputValue(entry.end_time)
    const minutes = clampMinutes(entry.minutes)
    setEditingId(entry.id)
    setDraft({
      minutes,
      startTime,
      endTime,
      topic: entry.topic ?? '',
      note: entry.note ?? '',
      mood: entry.mood ?? null,
    })
    syncDurationFields(minutes)
    setRangeError(null)
  }

  useEffect(() => {
    if (!open) return
    resetDraft()
  }, [open, dateKey])

  useEffect(() => {
    if (!editingId) return
    if (!entries.some((e) => e.id === editingId)) {
      resetDraft()
    }
  }, [entries, editingId])

  if (!dateKey) return null

  const total = entries.reduce((sum, e) => sum + e.minutes, 0)
  const isToday = dateKey === toDateKey(new Date())
  const timerForThisWorkspace = activeSession

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

  /** Reads the live hour/minute fields so Save works even if the inputs never blurred. */
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

  function buildInputFromDraft(): EntryDraftInput | null {
    const minutes = resolveDurationFromInputs()
    const startTime = draft.startTime
    const endTime = startTime ? (addMinutesToClock(startTime, minutes) ?? '') : draft.endTime

    if ((startTime && !endTime) || (!startTime && endTime)) {
      setRangeError('Set both start and end time, or leave both empty.')
      return null
    }
    if (startTime && endTime && durationFromRange(startTime, endTime) == null) {
      setRangeError('End time must be after start time.')
      return null
    }
    if (minutes <= 0) return null

    // Keep draft/duration fields in sync with what we're about to save.
    setMinutes(minutes)

    return {
      minutes,
      start_time: startTime ? toTimeInputValue(startTime) : null,
      end_time: endTime ? toTimeInputValue(endTime) : null,
      topic: draft.topic.trim() ? draft.topic.trim() : null,
      note: draft.note.trim() ? draft.note.trim() : null,
      mood: draft.mood,
    }
  }

  function handleSave() {
    const input = buildInputFromDraft()
    if (!input) return

    if (editingId) {
      onUpdate(editingId, input)
    } else {
      onAdd(input)
    }
    resetDraft()
  }

  function handleDelete(id: string) {
    if (editingId === id) resetDraft()
    onDelete(id)
  }

  return (
    <GlassModal open={open} onClose={onClose} title={format(fromDateKey(dateKey), 'EEEE, MMM d')}>
      <div className="flex flex-col gap-5">
        {isToday && (
          timerForThisWorkspace ? (
            <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3 flex flex-col gap-3">
              <p className="text-[12px] text-black/50 dark:text-white/50 text-center">
                {timerForThisWorkspace.runningSince
                  ? 'Timer is running for this workspace.'
                  : 'Timer is paused. Resume or clock out to save.'}
              </p>
              <div className="flex items-center gap-3">
                <span className="relative flex size-2.5 shrink-0">
                  {timerForThisWorkspace.runningSince && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-teal opacity-60" />
                  )}
                  <span
                    className={`relative inline-flex size-2.5 rounded-full ${timerForThisWorkspace.runningSince ? 'bg-accent-teal' : 'bg-black/25 dark:bg-white/30'}`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {timerForThisWorkspace.runningSince ? 'Tracking' : 'Paused'}
                  </p>
                  <p className="text-[18px] font-bold tabular-nums">
                    {timerForThisWorkspace.runningSince
                      ? formatElapsedClock(elapsedMsFor(timerForThisWorkspace.id))
                      : formatMinutes(
                          minutesFromSeconds(
                            storedSecondsFor(workspaceId) ||
                              Math.round(elapsedMsFor(timerForThisWorkspace.id) / 1000),
                          ),
                        )}
                  </p>
                </div>
                {timerForThisWorkspace.runningSince ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => void pause(workspaceId)}>
                    <Pause className="size-3.5 fill-current" />
                    Pause
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="secondary" onClick={() => void resume(workspaceId)}>
                    <Play className="size-3.5 fill-current" />
                    Resume
                  </Button>
                )}
                <Button type="button" size="sm" onClick={() => void requestStop(timerForThisWorkspace.id)}>
                  Clock out
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" size="lg" className="w-full" onClick={() => setClockInOpen(true)}>
              <Play className="size-4 fill-current" />
              Start tracking
            </Button>
          )
        )}

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
                const isActive = editingId === entry.id
                const MoodIcon = moodIcon(entry.mood)
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors',
                      isActive
                        ? 'bg-accent-blue/10 ring-1 ring-accent-blue/40'
                        : 'bg-black/[0.03] dark:bg-white/[0.05]',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => (isActive ? resetDraft() : loadEntryIntoDraft(entry))}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left rounded-xl -m-1 p-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                      aria-label={isActive ? 'Cancel editing entry' : 'Edit entry'}
                    >
                      <div
                        className="shrink-0 size-9 rounded-xl flex items-center justify-center text-[12px] font-bold tabular-nums text-white"
                        style={{ backgroundColor: accentHex }}
                      >
                        {formatMinutes(entry.minutes)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-[14px] font-medium truncate">{entry.topic || 'Time logged'}</p>
                          {MoodIcon && (
                            <MoodIcon
                              className="size-3.5 shrink-0 text-black/45 dark:text-white/45"
                              strokeWidth={2}
                              aria-label={MOOD_OPTIONS.find((o) => o.value === entry.mood)?.label}
                            />
                          )}
                        </div>
                        {startLabel && endLabel && (
                          <p className="text-[12px] font-medium tabular-nums text-black/55 dark:text-white/55">
                            {startLabel} – {endLabel}
                          </p>
                        )}
                        {entry.note && (
                          <p className="text-[12px] text-black/45 dark:text-white/45 truncate">{entry.note}</p>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
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
          <div className="flex items-center justify-between gap-2 px-0.5 pt-3">
            <span className="text-[13px] font-medium text-black/60 dark:text-white/60">
              {isEditing ? 'Edit time block' : 'Log time'}
            </span>
            {isEditing && (
              <button
                type="button"
                onClick={resetDraft}
                className="text-[12px] font-medium text-black/45 dark:text-white/45 hover:text-black/70 dark:hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

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
                  onFocus={(e) => e.currentTarget.select()}
                  onMouseUp={(e) => e.preventDefault()}
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
                  onFocus={(e) => e.currentTarget.select()}
                  onMouseUp={(e) => e.preventDefault()}
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
              <button
                key={preset}
                type="button"
                onClick={() => setMinutes(preset)}
                className={cn(
                  'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                  draft.minutes === preset
                    ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                )}
              >
                {formatMinutes(preset)}
              </button>
            ))}
          </div>

          <input
            value={draft.topic}
            onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value.slice(0, 80) }))}
            placeholder="Topic (optional) — e.g. Client call"
            className={inputClass}
          />

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">
              How was your day?
            </span>
            <div className="flex items-center justify-center gap-3">
              {MOOD_OPTIONS.map(({ value, icon: Icon, label }) => {
                const selected = draft.mood === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, mood: selected ? null : value }))}
                    className={cn(
                      'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all',
                      selected
                        ? 'bg-accent-blue/15 ring-1 ring-accent-blue/40'
                        : 'bg-black/[0.03] dark:bg-white/[0.05]',
                    )}
                    aria-label={label}
                    aria-pressed={selected}
                  >
                    <Icon className="size-6" strokeWidth={2} style={{ opacity: selected ? 1 : 0.4 }} />
                    <span className="text-[11px] font-medium" style={{ opacity: selected ? 1 : 0.4 }}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <input
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value.slice(0, 500) }))}
            placeholder="Note (optional)"
            className={inputClass}
          />

          <Button onClick={handleSave} loading={isSaving} size="lg" className="w-full">
            {isEditing ? <Check className="size-4" /> : <Plus className="size-4" />}
            {isEditing ? 'Save changes' : 'Add time block'}
          </Button>
        </div>
      </div>

      <ClockInPickerModal
        open={clockInOpen}
        onClose={() => setClockInOpen(false)}
        workspaces={workspaces ?? []}
        busyWorkspaceIds={(workspaces ?? [])
          .filter((w) => sessionForWorkspace(w.id))
          .map((w) => w.id)}
        preselectedWorkspaceId={workspaceId}
        onStart={(id, options) => start(id, options)}
      />
    </GlassModal>
  )
}
