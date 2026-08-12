import { useEffect, useState } from 'react'
import { Check, Minus, Play, Plus } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { useCreateTimesheetEntry } from '@/hooks/useTimesheetEntries'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import {
  addMinutesToClock,
  draftFromTimerRange,
  durationFromRange,
  toTimeInputValue,
} from '@/lib/timesheetLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import type { TimesheetEntryInput } from '@/lib/types'

const MINUTES_STEP = 15
const MAX_MINUTES = 24 * 60

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

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return MINUTES_STEP
  return Math.min(MAX_MINUTES, Math.max(1, Math.round(value)))
}

export function StopTimerModal() {
  const { stoppingSession, confirmOpen, stoppedAt, cancelStop, discard } = useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()
  const workspace = workspaces?.find((w) => w.id === stoppingSession?.workspaceId)
  const createEntry = useCreateTimesheetEntry(stoppingSession?.workspaceId ?? '')

  const [entryDate, setEntryDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [minutes, setMinutesState] = useState(1)
  const [hoursText, setHoursText] = useState('0')
  const [minutesText, setMinutesText] = useState('1')
  const [topic, setTopic] = useState('')
  const [note, setNote] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  function syncDurationFields(total: number) {
    const clamped = clampMinutes(total)
    setHoursText(String(Math.floor(clamped / 60)))
    setMinutesText(String(clamped % 60))
    return clamped
  }

  useEffect(() => {
    if (!confirmOpen || !stoppingSession || !stoppedAt) return
    const draft = draftFromTimerRange(new Date(stoppingSession.startedAt), stoppedAt)
    setEntryDate(draft.entry_date)
    setStartTime(draft.start_time)
    setEndTime(draft.end_time)
    setMinutesState(syncDurationFields(draft.minutes))
    setTopic(stoppingSession.topic ?? '')
    setNote('')
    setRangeError(null)
    setSaveError(null)
  }, [confirmOpen, stoppingSession, stoppedAt])

  function applyRange(nextStart: string, nextEnd: string) {
    if (!nextStart || !nextEnd) {
      setStartTime(nextStart)
      setEndTime(nextEnd)
      setRangeError(null)
      return
    }
    const duration = durationFromRange(nextStart, nextEnd)
    if (duration == null) {
      setStartTime(nextStart)
      setEndTime(nextEnd)
      setRangeError('End time must be after start time.')
      return
    }
    setRangeError(null)
    setStartTime(nextStart)
    setEndTime(nextEnd)
    setMinutesState(syncDurationFields(duration))
  }

  function setMinutes(totalMinutes: number) {
    const clamped = syncDurationFields(totalMinutes)
    setRangeError(null)
    setMinutesState(clamped)
    if (!startTime) {
      setEndTime('')
      return
    }
    setEndTime(addMinutesToClock(startTime, clamped) ?? '')
  }

  function resolveDurationFromInputs(hoursRaw = hoursText, minutesRaw = minutesText): number {
    let hours = Math.max(0, Math.min(24, Number.parseInt(hoursRaw, 10) || 0))
    let mins = Math.max(0, Math.min(59, Number.parseInt(minutesRaw, 10) || 0))
    if (hours === 24) mins = 0
    const totalMinutes = hours * 60 + mins
    return clampMinutes(totalMinutes > 0 ? totalMinutes : MINUTES_STEP)
  }

  function buildInput(): TimesheetEntryInput | null {
    const nextMinutes = resolveDurationFromInputs()
    const nextStart = startTime
    const nextEnd = endTime

    if ((nextStart && !nextEnd) || (!nextStart && nextEnd)) {
      setRangeError('Set both start and end time, or leave both empty.')
      return null
    }
    if (nextStart && nextEnd && durationFromRange(nextStart, nextEnd) == null) {
      setRangeError('End time must be after start time.')
      return null
    }

    return {
      entry_date: entryDate,
      minutes: nextMinutes,
      start_time: nextStart ? toTimeInputValue(nextStart, true) : null,
      end_time: nextEnd ? toTimeInputValue(nextEnd, true) : null,
      topic: topic.trim() ? topic.trim() : null,
      note: note.trim() ? note.trim() : null,
    }
  }

  async function handleSave() {
    const input = buildInput()
    if (!input || !stoppingSession) return
    setSaveError(null)
    try {
      await createEntry.mutateAsync(input)
      await discard()
    } catch (error) {
      setSaveError(getErrorMessage(error))
    }
  }

  async function handleDiscard() {
    setSaveError(null)
    try {
      await discard()
    } catch (error) {
      setSaveError(getErrorMessage(error))
    }
  }

  const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null

  return (
    <GlassModal open={confirmOpen && Boolean(stoppingSession)} onClose={cancelStop} title="Clock out">
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1">
          Check that the time looks right, then save it to your timesheet.
        </p>

        {workspace && (
          <div className="flex items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3">
            <div
              className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: accent ? `${accent.hex}22` : undefined }}
            >
              {workspace.emoji}
            </div>
            <span className="font-medium truncate">{workspace.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-black/45 dark:text-white/45 px-0.5">From</span>
            <input
              type="time"
              step="1"
              value={startTime}
              onChange={(e) => applyRange(e.target.value, endTime)}
              className={timeInputClass}
            />
          </label>
          <span className="text-black/30 dark:text-white/30 pt-5">→</span>
          <label className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-black/45 dark:text-white/45 px-0.5">Until</span>
            <input
              type="time"
              step="1"
              value={endTime}
              onChange={(e) => applyRange(startTime, e.target.value)}
              className={timeInputClass}
            />
          </label>
        </div>

        {rangeError && <p className="text-[12px] text-accent-red text-center -mt-1">{rangeError}</p>}

        <div className="flex items-center justify-center gap-3 glass-panel rounded-2xl py-3 px-3">
          <button
            type="button"
            onClick={() => setMinutes(minutes - MINUTES_STEP)}
            className="size-9 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
          >
            <Minus className="size-4" />
          </button>
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
              onBlur={() => setMinutes(resolveDurationFromInputs(hoursText, minutesText))}
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
              onBlur={() => setMinutes(resolveDurationFromInputs(hoursText, minutesText))}
              aria-label="Minutes"
              className="w-12 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-center text-xl font-bold tabular-nums outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[13px] font-medium text-black/45 dark:text-white/45">m</span>
          </div>
          <button
            type="button"
            onClick={() => setMinutes(minutes + MINUTES_STEP)}
            className="size-9 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, 80))}
          placeholder="Topic (optional) — e.g. Client call"
          className={inputClass}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder="Note (optional)"
          className={inputClass}
        />

        {saveError && <p className="text-[12px] text-accent-red text-center">{saveError}</p>}

        <Button onClick={handleSave} loading={createEntry.isPending} size="lg" className="w-full">
          <Check className="size-4" />
          Save time block
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={cancelStop}
          disabled={createEntry.isPending}
        >
          <Play className="size-4 fill-current" />
          Resume timer
        </Button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={createEntry.isPending}
          className="h-11 rounded-2xl text-[14px] font-medium text-accent-red hover:bg-accent-red/10 active:scale-95 transition-all disabled:opacity-50"
        >
          Discard timer
        </button>
      </div>
    </GlassModal>
  )
}
