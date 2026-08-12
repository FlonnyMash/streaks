import { GlassModal } from '@/components/ui/GlassModal'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import type { TimesheetWorkspace } from '@/lib/types'

interface ClockInPickerModalProps {
  open: boolean
  onClose: () => void
  workspaces: TimesheetWorkspace[]
  /** Workspace ids that already have a running timer. */
  busyWorkspaceIds?: string[]
  onSelect: (workspaceId: string) => void
}

export function ClockInPickerModal({
  open,
  onClose,
  workspaces,
  busyWorkspaceIds = [],
  onSelect,
}: ClockInPickerModalProps) {
  const busy = new Set(busyWorkspaceIds)

  return (
    <GlassModal open={open} onClose={onClose} title="Clock in">
      <div className="flex flex-col gap-2">
        <p className="text-[14px] text-black/55 dark:text-white/55 -mt-1 mb-1">
          Choose a workspace to start tracking.
        </p>
        {workspaces.map((workspace) => {
          const accent = ACCENT_COLOR_MAP[workspace.color]
          const isBusy = busy.has(workspace.id)
          return (
            <button
              key={workspace.id}
              type="button"
              disabled={isBusy}
              onClick={() => {
                if (isBusy) return
                onSelect(workspace.id)
                onClose()
              }}
              className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <div
                className="size-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: `${accent.hex}22` }}
              >
                {workspace.emoji}
              </div>
              <span className="font-medium truncate flex-1 min-w-0">{workspace.name}</span>
              {isBusy && (
                <span className="text-[12px] font-medium text-accent-teal shrink-0">Running</span>
              )}
            </button>
          )
        })}
      </div>
    </GlassModal>
  )
}
