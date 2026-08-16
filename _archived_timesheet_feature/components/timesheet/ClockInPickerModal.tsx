import { useEffect, useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/timesheetLogic'
import { cn } from '@/lib/utils'
import type { TimesheetWorkspace } from '@/lib/types'

type WhenMode = 'now' | 'past'

interface ClockInPickerModalProps {
  open: boolean
  onClose: () => void
  workspaces: TimesheetWorkspace[]
  /** Workspace ids that already have a running (not paused) timer. */
  busyWorkspaceIds?: string[]
  /** Skip workspace list and start for this workspace. */
  preselectedWorkspaceId?: string | null
  onStart: (workspaceId: string, options?: { startedAt?: Date; topic?: string }) => void
}

const fieldClass = cn(
  'h-11 w-full rounded-2xl px-3 text-[15px] outline-none transition-all',
  'bg-black/[0.04] dark:bg-white/[0.06]',
  'border border-black/[0.06] dark:border-white/[0.08]',
  'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
)

const timeFieldClass = cn(fieldClass, 'font-semibold tabular-nums')

export function ClockInPickerModal({
  open,
  onClose,
  workspaces,
  busyWorkspaceIds = [],
  preselectedWorkspaceId = null,
  onStart,
}: ClockInPickerModalProps) {
  const busy = useMemo(() => new Set(busyWorkspaceIds), [busyWorkspaceIds])
  const available = useMemo(
    () => workspaces.filter((w) => !busy.has(w.id)),
    [busy, workspaces],
  )

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [whenMode, setWhenMode] = useState<WhenMode>('now')
  const [pastLocal, setPastLocal] = useState(() => toDateTimeLocalValue(new Date()))
  const [topic, setTopic] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setWhenMode('now')
    setPastLocal(toDateTimeLocalValue(new Date()))
    setTopic('')
    setError(null)
    if (preselectedWorkspaceId && !busy.has(preselectedWorkspaceId)) {
      setWorkspaceId(preselectedWorkspaceId)
      return
    }
    if (available.length === 1) {
      setWorkspaceId(available[0].id)
      return
    }
    setWorkspaceId(null)
  }, [open, preselectedWorkspaceId, available, busy])

  const selected = workspaces.find((w) => w.id === workspaceId) ?? null
  const needsWorkspacePick = !preselectedWorkspaceId && available.length > 1 && !workspaceId

  function handleConfirm() {
    if (!workspaceId) {
      setError('Choose a workspace.')
      return
    }
    const trimmedTopic = topic.trim() || undefined
    if (whenMode === 'now') {
      onStart(workspaceId, trimmedTopic ? { topic: trimmedTopic } : undefined)
      onClose()
      return
    }
    const past = fromDateTimeLocalValue(pastLocal)
    if (!past) {
      setError('Enter a valid date and time.')
      return
    }
    if (past.getTime() > Date.now() + 1000) {
      setError('Start time can’t be in the future.')
      return
    }
    onStart(workspaceId, {
      startedAt: past,
      ...(trimmedTopic ? { topic: trimmedTopic } : {}),
    })
    onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title="Clock in">
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1">
          {needsWorkspacePick
            ? 'Choose a workspace, then when the timer should start.'
            : 'Start now, or backdate the start if you already began working.'}
        </p>

        {needsWorkspacePick && (
          <div className="flex flex-col gap-2">
            {available.map((workspace) => {
              const accent = ACCENT_COLOR_MAP[workspace.color]
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    setWorkspaceId(workspace.id)
                    setError(null)
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                >
                  <div
                    className="size-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${accent.hex}22` }}
                  >
                    {workspace.emoji}
                  </div>
                  <span className="font-medium truncate flex-1 min-w-0">{workspace.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {!needsWorkspacePick && selected && (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3">
              <div
                className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: `${ACCENT_COLOR_MAP[selected.color].hex}22` }}
              >
                {selected.emoji}
              </div>
              <span className="font-medium truncate flex-1 min-w-0">{selected.name}</span>
              {!preselectedWorkspaceId && available.length > 1 && (
                <button
                  type="button"
                  onClick={() => setWorkspaceId(null)}
                  className="text-[12px] font-medium text-accent-blue shrink-0"
                >
                  Change
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setWhenMode('now')
                  setError(null)
                }}
                className={cn(
                  'h-11 rounded-2xl text-[14px] font-medium transition-all',
                  whenMode === 'now'
                    ? 'bg-accent-blue text-white'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15',
                )}
              >
                Start now
              </button>
              <button
                type="button"
                onClick={() => {
                  setWhenMode('past')
                  setPastLocal(toDateTimeLocalValue(new Date()))
                  setError(null)
                }}
                className={cn(
                  'h-11 rounded-2xl text-[14px] font-medium transition-all',
                  whenMode === 'past'
                    ? 'bg-accent-blue text-white'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15',
                )}
              >
                From earlier
              </button>
            </div>

            {whenMode === 'past' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-black/45 dark:text-white/45 px-0.5">
                  Started at
                </span>
                <input
                  type="datetime-local"
                  step="1"
                  max={toDateTimeLocalValue(new Date())}
                  value={pastLocal}
                  onChange={(e) => {
                    setPastLocal(e.target.value)
                    setError(null)
                  }}
                  className={timeFieldClass}
                />
              </label>
            )}

            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 80))}
              placeholder="Topic (optional) — e.g. Client call"
              className={fieldClass}
            />

            {error && <p className="text-[12px] text-accent-red text-center -mt-1">{error}</p>}

            <Button type="button" size="lg" className="w-full" onClick={handleConfirm}>
              <Play className="size-4 fill-current" />
              {whenMode === 'now' ? 'Start timer' : 'Start from this time'}
            </Button>
          </>
        )}

        {!needsWorkspacePick && !selected && available.length === 0 && (
          <p className="text-[14px] text-black/50 dark:text-white/50 text-center py-2">
            Every workspace already has a timer running.
          </p>
        )}
      </div>
    </GlassModal>
  )
}
