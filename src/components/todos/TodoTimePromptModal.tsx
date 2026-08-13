import { useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { Check } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { useCreateTimesheetEntry } from '@/hooks/useTimesheetEntries'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { useTodoTimePrompt } from '@/hooks/useTodoTimePrompt'
import { useTodoTimer } from '@/hooks/useTodoTimer'
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

export function TodoTimePromptModal() {
  const { prompt, close } = useTodoTimePrompt()
  const { clearTimer } = useTodoTimer()
  const { data: workspaces } = useTimesheetWorkspaces()
  const workspace = workspaces?.find((w) => w.id === prompt?.workspaceId) ?? null
  const createEntry = useCreateTimesheetEntry(prompt?.workspaceId ?? '')

  const [error, setError] = useState<string | null>(null)
  const [skipping, setSkipping] = useState(false)

  const dayRows = (prompt?.days ?? [])
    .map((day) => ({ dateKey: day.dateKey, minutes: minutesFromSeconds(day.seconds) }))
    .filter((row) => row.minutes > 0)
  const totalMins = dayRows.reduce((sum, row) => sum + row.minutes, 0)
  const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null
  const pending = createEntry.isPending || skipping

  async function handleSkip() {
    if (!prompt) return
    setError(null)
    setSkipping(true)
    try {
      await clearTimer(prompt.todoId)
      close()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not close the timer.'))
    } finally {
      setSkipping(false)
    }
  }

  async function handleAdd() {
    if (!prompt || !workspace) return
    setError(null)
    try {
      for (const row of dayRows) {
        await createEntry.mutateAsync({
          entry_date: row.dateKey,
          minutes: row.minutes,
          start_time: null,
          end_time: null,
          topic: prompt.title,
          note: null,
          mood: null,
        })
      }
      await clearTimer(prompt.todoId)
      close()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add time to the timesheet.'))
    }
  }

  return (
    <GlassModal
      open={Boolean(prompt)}
      onClose={() => {
        if (!pending) void handleSkip()
      }}
      title="Save tracked time?"
    >
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1">
          You tracked {formatMinutes(totalMins || minutesFromSeconds(totalSeconds(prompt?.days ?? [])))} on this
          task. Add it to the workspace timesheet?
        </p>

        {workspace && (
          <div className="flex items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3">
            <div
              className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: accent ? `${accent.hex}22` : undefined }}
            >
              {workspace.emoji}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{workspace.name}</p>
              <p className="text-[12px] text-black/45 dark:text-white/45 truncate">{prompt?.title}</p>
            </div>
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

        {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}

        {workspace ? (
          <Button onClick={() => void handleAdd()} loading={createEntry.isPending} disabled={skipping} size="lg" className="w-full">
            <Check className="size-4" />
            Add to timesheet
          </Button>
        ) : (
          <p className="text-[13px] text-black/45 dark:text-white/45 text-center">
            This task has no workspace, so time can’t be added to a timesheet.
          </p>
        )}
        <Button variant="secondary" size="lg" className="w-full" onClick={() => void handleSkip()} disabled={pending}>
          Don’t add
        </Button>
      </div>
    </GlassModal>
  )
}
