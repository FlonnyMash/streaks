import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { ArrowLeft, Check, Frown, Meh, Minus, Pause, Pencil, Play, Plus, Smile, Trash2 } from 'lucide-react'
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

function DurationIcon({
  minutes,
  accentHex,
  size,
}: {
  minutes: number
  accentHex: string
  size: 'sm' | 'lg'
}) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const twoLine = hours > 0 && mins > 0
  return (
    <div
      className={cn(
        'shrink-0 flex flex-col items-center justify-center text-center font-bold tabular-nums leading-none text-white',
        size === 'sm' ? 'size-9 rounded-xl text-[11px] gap-px' : 'size-14 rounded-2xl text-[15px] gap-0.5',
      )}
      style={{ backgroundColor: accentHex }}
    >
      {twoLine ? (
        <>
          <span>{hours}h</span>
          <span>{mins}m</span>
        </>
      ) : (
        <span>{hours > 0 ? `${hours}h` : `${mins}m`}</span>
      )}
    </div>
  )
}

type EntryDraftInput = Omit<TimesheetEntryInput, 'entry_date'>

type View =
  | { mode: 'list' }
  | { mode: 'detail'; entryId: string }
  | { mode: 'form'; editingId: string | null }

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

const noteFieldClass = cn(
  'min-h-[5.5rem] rounded-2xl px-4 py-3 text-[15px] outline-none transition-all resize-none',
  'bg-black/[0.04] dark:bg-white/[0.06]',
  'border border-black/[0.06] dark:border-white/[0.08]',
  'placeholder:text-black/30 dark:placeholder:text-white/30',
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
  const [view, setView] = useState<View>({ mode: 'list' })
  const [draft, setDraft] = useState(() => defaultDraft())
  const [hoursText, setHoursText] = useState('0')
  const [minutesText, setMinutesText] = useState('30')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [clockInOpen, setClockInOpen] = useState(false)
  const { sessionForWorkspace, elapsedMsFor, storedSecondsFor, start, requestStop, pause, resume, runningWorkspaceIds } =
    useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()
  const presets = normalizeQuickPresets(quickPresets ?? DEFAULT_QUICK_PRESETS)
  const hasRange = Boolean(draft.startTime && draft.endTime)
  const isEditing = view.mode === 'form' && view.editingId !== null
  const activeSession = sessionForWorkspace(workspaceId)
  const focusedEntryId = view.mode === 'detail' ? view.entryId : view.mode === 'form' ? view.editingId : null
  const focusedEntry = focusedEntryId ? (entries.find((e) => e.id === focusedEntryId) ?? null) : null

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
  }

  function loadEntryIntoDraft(entry: TimesheetEntry) {
    const startTime = toTimeInputValue(entry.start_time)
    const endTime = toTimeInputValue(entry.end_time)
    const minutes = clampMinutes(entry.minutes)
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

  function goToList() {
    resetDraft()
    setView({ mode: 'list' })
  }

  function openCreateForm() {
    resetDraft()
    setView({ mode: 'form', editingId: null })
  }

  function openDetail(entryId: string) {
    resetDraft()
    setView({ mode: 'detail', entryId })
  }

  function openEditForm(entry: TimesheetEntry) {
    loadEntryIntoDraft(entry)
    setView({ mode: 'form', editingId: entry.id })
  }

  useEffect(() => {
    if (!open) return
    resetDraft()
    setView({ mode: 'list' })
  }, [open, dateKey])

  useEffect(() => {
    if (!focusedEntryId) return
    if (!entries.some((e) => e.id === focusedEntryId)) {
      goToList()
    }
  }, [entries, focusedEntryId])

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

    if (view.mode === 'form' && view.editingId) {
      const id = view.editingId
      onUpdate(id, input)
      resetDraft()
      setView({ mode: 'detail', entryId: id })
      return
    }

    onAdd(input)
    goToList()
  }

  function handleDelete(id: string) {
    onDelete(id)
    goToList()
  }

  function handleFormBack() {
    if (view.mode === 'form' && view.editingId) {
      resetDraft()
      setView({ mode: 'detail', entryId: view.editingId })
      return
    }
    goToList()
  }

  return (
    <GlassModal open={open} onClose={onClose} title={format(fromDateKey(dateKey), 'EEEE, MMM d')}>
      <div className="flex flex-col gap-5">
        {view.mode === 'list' && (
          <>
            {isToday &&
              (timerForThisWorkspace ? (
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
              ))}

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
                    const MoodIcon = moodIcon(entry.mood)
                    return (
                      <motion.button
                        key={entry.id}
                        type="button"
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onClick={() => openDetail(entry.id)}
                        aria-label={`View ${entry.topic || 'time block'}`}
                        className="flex items-start gap-3 rounded-2xl px-3.5 py-3 text-left bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <DurationIcon minutes={entry.minutes} accentHex={accentHex} size="sm" />
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
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}

            <Button type="button" size="lg" className="w-full" onClick={openCreateForm}>
              <Plus className="size-4" />
              Add time block
            </Button>
          </>
        )}

        {view.mode === 'detail' && focusedEntry && (
          <EntryDetail
            entry={focusedEntry}
            accentHex={accentHex}
            onBack={goToList}
            onEdit={() => openEditForm(focusedEntry)}
            onDelete={() => handleDelete(focusedEntry.id)}
          />
        )}

        {view.mode === 'form' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <button
                type="button"
                onClick={handleFormBack}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 transition-colors"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <span className="text-[13px] font-medium text-black/60 dark:text-white/60">
                {isEditing ? 'Edit time block' : 'Log time'}
              </span>
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

            <textarea
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value.slice(0, 500) }))}
              placeholder="Note (optional)"
              rows={3}
              className={noteFieldClass}
            />

            <Button onClick={handleSave} loading={isSaving} size="lg" className="w-full">
              {isEditing ? <Check className="size-4" /> : <Plus className="size-4" />}
              {isEditing ? 'Save changes' : 'Add time block'}
            </Button>
          </div>
        )}
      </div>

      <ClockInPickerModal
        open={clockInOpen}
        onClose={() => setClockInOpen(false)}
        workspaces={workspaces ?? []}
        busyWorkspaceIds={runningWorkspaceIds}
        preselectedWorkspaceId={workspaceId}
        onStart={(id, options) => start(id, options)}
      />
    </GlassModal>
  )
}

function EntryDetail({
  entry,
  accentHex,
  onBack,
  onEdit,
  onDelete,
}: {
  entry: TimesheetEntry
  accentHex: string
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const startLabel = formatClockTime(entry.start_time)
  const endLabel = formatClockTime(entry.end_time)
  const MoodIcon = moodIcon(entry.mood)
  const moodLabel = MOOD_OPTIONS.find((o) => o.value === entry.mood)?.label

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-4 py-5">
        <DurationIcon minutes={entry.minutes} accentHex={accentHex} size="lg" />
        <div className="text-center min-w-0 w-full">
          <p className="text-[17px] font-semibold tracking-tight">{entry.topic || 'Time logged'}</p>
          {startLabel && endLabel && (
            <p className="mt-1 text-[14px] font-medium tabular-nums text-black/55 dark:text-white/55">
              {startLabel} – {endLabel}
            </p>
          )}
        </div>
      </div>

      {MoodIcon && moodLabel && (
        <div className="flex items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3">
          <MoodIcon className="size-5 shrink-0 text-black/55 dark:text-white/55" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-black/45 dark:text-white/45">Mood</p>
            <p className="text-[14px] font-medium">{moodLabel}</p>
          </div>
        </div>
      )}

      {entry.note && (
        <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3">
          <p className="text-[11px] font-medium text-black/45 dark:text-white/45 mb-1">Note</p>
          <p className="text-[14px] whitespace-pre-wrap break-words text-black/80 dark:text-white/80">{entry.note}</p>
        </div>
      )}

      <Button type="button" size="lg" className="w-full" onClick={onEdit}>
        <Pencil className="size-4" />
        Edit details
      </Button>
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={onDelete}>
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  )
}
