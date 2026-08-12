import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { useCreateTimesheetEntry } from '@/hooks/useTimesheetEntries'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { useTodoTimePrompt } from '@/hooks/useTodoTimePrompt'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { getErrorMessage } from '@/lib/errors'
import { DEFAULT_QUICK_PRESETS, draftFromTimerRange, normalizeQuickPresets } from '@/lib/timesheetLogic'
import { cn, formatMinutes, toDateKey } from '@/lib/utils'

const MAX_MINUTES = 24 * 60

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return 15
  return Math.min(MAX_MINUTES, Math.max(1, Math.round(value)))
}

export function TodoTimePromptModal() {
  const { prompt, close } = useTodoTimePrompt()
  const { stoppingSession, stoppedAt, discard } = useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()
  const workspace = workspaces?.find((w) => w.id === prompt?.workspaceId)
  const createEntry = useCreateTimesheetEntry(prompt?.workspaceId ?? '')

  const [minutes, setMinutes] = useState(30)
  const [minutesText, setMinutesText] = useState('30')
  const [error, setError] = useState<string | null>(null)
  const [skipping, setSkipping] = useState(false)

  const isSaveTimer = prompt?.mode === 'save-timer'
  const presets = normalizeQuickPresets(workspace?.quick_presets ?? DEFAULT_QUICK_PRESETS)
  const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null

  const timerDraft =
    isSaveTimer && stoppingSession && stoppedAt
      ? draftFromTimerRange(new Date(stoppingSession.startedAt), stoppedAt)
      : null

  useEffect(() => {
    if (!prompt) return
    setError(null)
    setSkipping(false)
    if (prompt.mode === 'log-estimate') {
      const initial = normalizeQuickPresets(workspace?.quick_presets ?? DEFAULT_QUICK_PRESETS)[0] ?? 30
      setMinutes(initial)
      setMinutesText(String(initial))
    }
  }, [prompt, workspace?.quick_presets])

  async function handleSkip() {
    setError(null)
    setSkipping(true)
    try {
      if (isSaveTimer) await discard()
      close()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not skip.'))
    } finally {
      setSkipping(false)
    }
  }

  async function handleSave() {
    if (!prompt) return
    setError(null)
    try {
      if (isSaveTimer) {
        if (!timerDraft) {
          setError('The timer is no longer available.')
          return
        }
        await createEntry.mutateAsync({
          entry_date: timerDraft.entry_date,
          minutes: timerDraft.minutes,
          start_time: timerDraft.start_time,
          end_time: timerDraft.end_time,
          topic: prompt.title,
          note: null,
          mood: null,
        })
        await discard()
      } else {
        const nextMinutes = clampMinutes(Number.parseInt(minutesText, 10) || minutes)
        await createEntry.mutateAsync({
          entry_date: toDateKey(new Date()),
          minutes: nextMinutes,
          start_time: null,
          end_time: null,
          topic: prompt.title,
          note: null,
          mood: null,
        })
      }
      close()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save time.'))
    }
  }

  const pending = createEntry.isPending || skipping
  const displayMinutes = isSaveTimer ? (timerDraft?.minutes ?? 1) : clampMinutes(Number.parseInt(minutesText, 10) || minutes)

  return (
    <GlassModal
      open={Boolean(prompt)}
      onClose={() => {
        if (!pending) void handleSkip()
      }}
      title={isSaveTimer ? 'Save tracked time?' : 'Log time?'}
    >
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1">
          {isSaveTimer
            ? `Save ${formatMinutes(displayMinutes)} to this workspace’s timesheet?`
            : 'You finished this task without a timer. Log an estimate to the linked workspace.'}
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

        {!isSaveTimer && (
          <>
            <TextField
              label="Minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_MINUTES}
              value={minutesText}
              onChange={(e) => setMinutesText(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              onBlur={() => {
                const next = clampMinutes(Number.parseInt(minutesText, 10) || minutes)
                setMinutes(next)
                setMinutesText(String(next))
              }}
            />
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setMinutes(preset)
                    setMinutesText(String(preset))
                  }}
                  className={cn(
                    'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                    displayMinutes === preset
                      ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                  )}
                >
                  {formatMinutes(preset)}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}

        <Button onClick={() => void handleSave()} loading={createEntry.isPending} disabled={skipping} size="lg" className="w-full">
          <Check className="size-4" />
          {isSaveTimer ? `Save ${formatMinutes(displayMinutes)}` : 'Save time'}
        </Button>
        <Button variant="secondary" size="lg" className="w-full" onClick={() => void handleSkip()} disabled={pending}>
          Skip
        </Button>
      </div>
    </GlassModal>
  )
}
