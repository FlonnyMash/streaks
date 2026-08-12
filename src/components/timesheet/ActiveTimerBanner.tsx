import { Link } from 'react-router-dom'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { formatElapsedClock } from '@/lib/timesheetLogic'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { Button } from '@/components/ui/Button'

export function ActiveTimerBanner() {
  const { sessions, elapsedMsFor, requestStop } = useTimesheetTimer()
  const { data: workspaces } = useTimesheetWorkspaces()

  if (sessions.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-5">
      {sessions.map((session) => {
        const workspace = workspaces?.find((w) => w.id === session.workspaceId)
        const accent = workspace ? ACCENT_COLOR_MAP[workspace.color] : null
        return (
          <div key={session.id} className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-teal opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-accent-teal" />
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
              <span className="min-w-0 flex-1 text-[14px] font-medium truncate">Timer running</span>
            )}
            <span className="text-[15px] font-bold tabular-nums shrink-0">
              {formatElapsedClock(elapsedMsFor(session.id))}
            </span>
            <Button type="button" size="sm" className="shrink-0" onClick={() => requestStop(session.id)}>
              Clock out
            </Button>
          </div>
        )
      })}
    </div>
  )
}
