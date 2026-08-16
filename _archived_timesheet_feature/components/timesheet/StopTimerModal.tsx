import { useEffect, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { Check, Frown, Meh, Play, Smile } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { useCreateTimesheetEntry } from '@/hooks/useTimesheetEntries'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { getErrorMessage } from '@/lib/errors'
import { minutesFromSeconds, totalSeconds } from '@/lib/todoTimerLogic'
import { cn, formatMinutes, fromDateKey } from '@/lib/utils'
import type { Mood } from '@/lib/types'

const MOOD_OPTIONS: Array<{ value: Mood; icon: typeof Frown; label: string }> = [
  { value: 1, icon: Frown, label: 'Rough' },
  { value: 2, icon: Meh, label: 'Okay' },
  { value: 3, icon: Smile, label: 'Great' },
]

const inputClass = cn(
  'h-11 rounded-2xl px-4 text-[15px] outline-none transition-all',
  'bg-black/[0.04] dark:bg-white/[0.06]',
  'border border-black/[0.06] dark:border-white/[0.08]',
  'placeholder:text-black/30 dark:placeholder:text-white/30',
  'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
)

function dayLabel(dateKey: string): string {
  const date = fromDateKey(dateKey)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

export function StopTimerModal() {
  const { endingSession, endDays, confirmOpen, cancelStop, discard, resume, clearSession } = useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()
  const workspace = workspaces?.find((w) => w.id === endingSession?.workspaceId)
  const createEntry = useCreateTimesheetEntry(endingSession?.workspaceId ?? '')

  const [topic, setTopic] = useState('')
  const [note, setNote] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)

  const dayRows = endDays
    .map((day) => ({ dateKey: day.dateKey, minutes: minutesFromSeconds(day.seconds) }))
    .filter((row) => row.minutes > 0)
  const totalMins = dayRows.reduce((sum, row) => sum + row.minutes, 0)
  const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null
  const pending = createEntry.isPending || discarding

  useEffect(() => {
    if (!confirmOpen || !endingSession) return
    setTopic(endingSession.topic ?? '')
    setNote('')
    setMood(null)
    setSaveError(null)
    setDiscarding(false)
  }, [confirmOpen, endingSession])

  async function handleKeepTracking() {
    cancelStop()
    if (endingSession && !endingSession.runningSince) {
      await resume(endingSession.workspaceId)
    }
  }

  async function handleDiscard() {
    setSaveError(null)
    setDiscarding(true)
    try {
      await discard()
    } catch (error) {
      setSaveError(getErrorMessage(error))
    } finally {
      setDiscarding(false)
    }
  }

  async function handleSave() {
    if (!endingSession || !workspace) return
    setSaveError(null)
    try {
      for (const row of dayRows) {
        await createEntry.mutateAsync({
          entry_date: row.dateKey,
          minutes: row.minutes,
          start_time: null,
          end_time: null,
          topic: topic.trim() ? topic.trim() : null,
          note: note.trim() ? note.trim() : null,
          mood,
        })
      }
      await clearSession(endingSession.workspaceId)
      cancelStop()
    } catch (error) {
      setSaveError(getErrorMessage(error))
    }
  }

  return (
    <GlassModal
      open={confirmOpen && Boolean(endingSession)}
      onClose={() => {
        if (!pending) cancelStop()
      }}
      title="Clock out"
    >
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1">
          You tracked{' '}
          {formatMinutes(totalMins || minutesFromSeconds(totalSeconds(endDays)))} on this workspace. Add it to
          the timesheet?
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

        {dayRows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {dayRows.map((row) => (
              <div
                key={row.dateKey}
                className="flex items-center justify-between rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-2.5"
              >
                <span className="text-[14px] font-medium">{dayLabel(row.dateKey)}</span>
                <span className="text-[14px] font-semibold tabular-nums">{formatMinutes(row.minutes)}</span>
              </div>
            ))}
            {dayRows.length > 1 && (
              <div className="flex items-center justify-between px-3.5 pt-1">
                <span className="text-[12px] font-medium text-black/45 dark:text-white/45">Total</span>
                <span className="text-[13px] font-semibold tabular-nums">{formatMinutes(totalMins)}</span>
              </div>
            )}
          </div>
        )}

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, 80))}
          placeholder="Topic (optional) — e.g. Client call"
          className={inputClass}
        />

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">How was your day?</span>
          <div className="flex items-center justify-center gap-3">
            {MOOD_OPTIONS.map(({ value, icon: Icon, label }) => {
              const selected = mood === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMood(selected ? null : value)}
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
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder="Note (optional)"
          className={inputClass}
        />

        {saveError && <p className="text-[12px] text-accent-red text-center">{saveError}</p>}

        <Button
          onClick={() => void handleSave()}
          loading={createEntry.isPending}
          disabled={discarding || dayRows.length === 0}
          size="lg"
          className="w-full"
        >
          <Check className="size-4" />
          Save to timesheet
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => void handleKeepTracking()}
          disabled={pending}
        >
          <Play className="size-4 fill-current" />
          Keep tracking
        </Button>
        <button
          type="button"
          onClick={() => void handleDiscard()}
          disabled={pending}
          className="h-11 rounded-2xl text-[14px] font-medium text-accent-red hover:bg-accent-red/10 active:scale-95 transition-all disabled:opacity-50"
        >
          Discard timer
        </button>
      </div>
    </GlassModal>
  )
}
