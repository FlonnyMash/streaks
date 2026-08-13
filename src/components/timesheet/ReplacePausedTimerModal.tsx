import { useEffect, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { useCreateTimesheetEntry } from '@/hooks/useTimesheetEntries'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { getErrorMessage } from '@/lib/errors'
import { minutesFromSeconds, totalSeconds } from '@/lib/todoTimerLogic'
import { formatMinutes, fromDateKey } from '@/lib/utils'

function dayLabel(dateKey: string): string {
  const date = fromDateKey(dateKey)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

export function ReplacePausedTimerModal() {
  const {
    pendingReplace,
    cancelReplace,
    confirmReplaceDiscard,
    confirmReplaceAfterSave,
    isSyncing,
  } = useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()
  const workspace = workspaces?.find((w) => w.id === pendingReplace?.workspaceId)
  const createEntry = useCreateTimesheetEntry(pendingReplace?.workspaceId ?? '')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const open = Boolean(pendingReplace)
  const dayRows = (pendingReplace?.days ?? [])
    .map((day) => ({ dateKey: day.dateKey, minutes: minutesFromSeconds(day.seconds) }))
    .filter((row) => row.minutes > 0)
  const totalMins = dayRows.reduce((sum, row) => sum + row.minutes, 0)
  const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null
  const pending = busy || isSyncing || createEntry.isPending

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
  }, [open, pendingReplace?.workspaceId])

  async function handleSave() {
    if (!pendingReplace || !workspace) return
    setError(null)
    setBusy(true)
    try {
      const topic = pendingReplace.topic?.trim() ? pendingReplace.topic.trim() : null
      for (const row of dayRows) {
        await createEntry.mutateAsync({
          entry_date: row.dateKey,
          minutes: row.minutes,
          start_time: null,
          end_time: null,
          topic,
          note: null,
          mood: null,
        })
      }
      await confirmReplaceAfterSave()
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  async function handleDiscard() {
    setError(null)
    setBusy(true)
    try {
      await confirmReplaceDiscard()
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <GlassModal
      open={open}
      onClose={() => {
        if (!pending) cancelReplace()
      }}
      title="Start a new timer?"
    >
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1">
          This workspace already has{' '}
          {formatMinutes(totalMins || minutesFromSeconds(totalSeconds(pendingReplace?.days ?? [])))} paused.
          Save it to the timesheet, discard it, or cancel.
        </p>

        {workspace && (
          <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-black/[0.03] dark:bg-white/[0.05]">
            <span
              className="size-9 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: accent ? `${accent.hex}22` : undefined }}
            >
              {workspace.emoji}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-[15px] truncate">{workspace.name}</p>
              {pendingReplace?.topic && (
                <p className="text-[13px] text-black/45 dark:text-white/45 truncate">{pendingReplace.topic}</p>
              )}
            </div>
          </div>
        )}

        {dayRows.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {dayRows.map((row) => (
              <li
                key={row.dateKey}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-[14px] bg-black/[0.03] dark:bg-white/[0.05]"
              >
                <span className="text-black/60 dark:text-white/60">{dayLabel(row.dateKey)}</span>
                <span className="font-semibold tabular-nums">{formatMinutes(row.minutes)}</span>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-[13px] text-accent-red">{error}</p>}

        <Button size="lg" className="w-full" onClick={() => void handleSave()} loading={pending}>
          Save and start new
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => void handleDiscard()}
          disabled={pending}
        >
          Discard and start new
        </Button>
        <Button variant="ghost" size="lg" className="w-full" onClick={cancelReplace} disabled={pending}>
          Cancel
        </Button>
      </div>
    </GlassModal>
  )
}
