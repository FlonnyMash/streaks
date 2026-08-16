import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { formatElapsedClock } from '@/lib/timesheetLogic'
import { minutesFromSeconds } from '@/lib/todoTimerLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatMinutes } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export function ActiveTimerBanner() {
  const { sessions, elapsedMsFor, storedSecondsFor, requestStop, pause, resume } = useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()

  if (sessions.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-5">
      {sessions.map((session) => {
        const workspace = workspaces?.find((w) => w.id === session.workspaceId)
        const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null
        const running = Boolean(session.runningSince)
        const stored = storedSecondsFor(session.workspaceId)
        return (
          <div key={session.id} className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="relative flex size-2.5 shrink-0">
              {running && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-teal opacity-60" />
              )}
              <span
                className={`relative inline-flex size-2.5 rounded-full ${running ? 'bg-accent-teal' : 'bg-black/25 dark:bg-white/30'}`}
              />
            </span>
            {workspace ? (
              <Link to={`/timesheet/${workspace.id}`} className="min-w-0 flex-1 flex items-center gap-2">
                <span
                  className="size-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: accent ? `${accent.hex}22` : undefined }}
                >
                  {workspace.emoji}
                </span>
                <span className="min-w-0 truncate text-[14px] font-medium">{workspace.name}</span>
              </Link>
            ) : (
              <span className="min-w-0 flex-1 text-[14px] font-medium truncate">
                {running ? 'Timer running' : 'Timer paused'}
              </span>
            )}
            <span className="text-[15px] font-bold tabular-nums shrink-0">
              {running
                ? formatElapsedClock(elapsedMsFor(session.id))
                : formatMinutes(minutesFromSeconds(stored || Math.round(elapsedMsFor(session.id) / 1000)))}
            </span>
            {running ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0"
                onClick={() => void pause(session.workspaceId)}
              >
                <Pause className="size-3.5 fill-current" />
                Pause
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0"
                onClick={() => void resume(session.workspaceId)}
              >
                <Play className="size-3.5 fill-current" />
                Resume
              </Button>
            )}
            <Button type="button" size="sm" className="shrink-0" onClick={() => void requestStop(session.id)}>
              Clock out
            </Button>
          </div>
        )
      })}
    </div>
  )
}
