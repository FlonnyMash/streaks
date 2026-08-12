import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  useDeleteTimesheetWorkspace,
  useTimesheetWorkspaces,
} from '@/hooks/useTimesheetWorkspaces'
import {
  useCreateTimesheetEntry,
  useDeleteTimesheetEntry,
  useTimesheetEntries,
  useUpdateTimesheetEntry,
} from '@/hooks/useTimesheetEntries'
import { TimesheetCalendar } from '@/components/timesheet/TimesheetCalendar'
import { DayEntriesModal } from '@/components/timesheet/DayEntriesModal'
import { CreateWorkspaceModal } from '@/components/timesheet/CreateWorkspaceModal'
import { ExportTimesheetModal } from '@/components/timesheet/ExportTimesheetModal'
import { ActiveTimerBanner } from '@/components/timesheet/ActiveTimerBanner'
import { Spinner } from '@/components/ui/Spinner'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { todayWeekMonthTotals } from '@/lib/timesheetLogic'
import { formatMinutes } from '@/lib/utils'

export function TimesheetWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workspaces, isLoading: workspacesLoading } = useTimesheetWorkspaces()
  const workspace = workspaces?.find((w) => w.id === id)
  const { data: entries, isLoading: entriesLoading } = useTimesheetEntries(id)
  const createEntry = useCreateTimesheetEntry(id ?? '')
  const updateEntry = useUpdateTimesheetEntry(id ?? '')
  const deleteEntry = useDeleteTimesheetEntry(id ?? '')
  const deleteWorkspace = useDeleteTimesheetWorkspace()

  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  if (workspacesLoading || entriesLoading || !workspace) {
    return <Spinner />
  }

  const accent = ACCENT_COLOR_MAP[workspace.color]
  const totals = todayWeekMonthTotals(entries ?? [])
  const selectedDayEntries = (entries ?? []).filter((e) => e.entry_date === selectedDayKey)

  async function handleDelete() {
    if (!id) return
    await deleteWorkspace.mutateAsync(id)
    navigate('/timesheet')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/timesheet')}
          className="size-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">{workspace.emoji}</span>
          <h1 className="font-bold text-lg sm:text-xl tracking-tight truncate">{workspace.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="size-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
            aria-label="Export timesheet"
            title="Export timesheet"
          >
            <Download className="size-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="size-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all"
              aria-label="More options"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-20 w-48 glass-panel rounded-2xl p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setEditOpen(true)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="size-4" /> Edit workspace
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirmDelete(true)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-medium text-accent-red hover:bg-accent-red/10 transition-colors"
                  >
                    <Trash2 className="size-4" /> Delete workspace
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ActiveTimerBanner />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Today', value: totals.today },
          { label: 'This week', value: totals.week },
          { label: 'This month', value: totals.month },
          { label: 'Total', value: totals.total },
        ].map(({ label, value }) => (
          <div key={label} className="glass-panel rounded-2xl p-3.5 flex flex-col items-center gap-1">
            <span className="text-xl font-bold tabular-nums tracking-tight" style={{ color: value > 0 ? accent.hex : undefined }}>
              {formatMinutes(value)}
            </span>
            <span className="text-[11px] font-medium text-black/45 dark:text-white/45">{label}</span>
          </div>
        ))}
      </div>

      <TimesheetCalendar
        entries={entries ?? []}
        year={view.year}
        month={view.month}
        accentHex={accent.hex}
        onMonthChange={(year, month) => setView({ year, month })}
        onSelectDay={setSelectedDayKey}
      />

      <p className="text-center text-[13px] text-black/40 dark:text-white/40 mt-4">
        Tap a day to log or review time blocks.
      </p>

      <DayEntriesModal
        open={selectedDayKey !== null}
        onClose={() => setSelectedDayKey(null)}
        dateKey={selectedDayKey}
        workspaceId={workspace.id}
        entries={selectedDayEntries}
        accentHex={accent.hex}
        isSaving={createEntry.isPending || updateEntry.isPending}
        quickPresets={workspace.quick_presets}
        onAdd={(input) => {
          if (!selectedDayKey) return
          createEntry.mutate({ entry_date: selectedDayKey, ...input })
        }}
        onUpdate={(entryId, input) => {
          updateEntry.mutate({ id: entryId, input })
        }}
        onDelete={(entryId) => deleteEntry.mutate(entryId)}
      />

      <CreateWorkspaceModal open={editOpen} onClose={() => setEditOpen(false)} editingWorkspace={workspace} />

      <ExportTimesheetModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={workspace.name}
        titleEmoji={workspace.emoji}
        accentHex={accent.hex}
        workspaces={[{ id: workspace.id, name: workspace.name, emoji: workspace.emoji }]}
        entries={entries ?? []}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative glass-panel rounded-[24px] p-5 w-full max-w-sm">
            <h3 className="font-semibold text-lg mb-1">Delete "{workspace.name}"?</h3>
            <p className="text-[14px] text-black/55 dark:text-white/55 mb-4">
              This permanently deletes the workspace and all its logged time. This can't be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-11 rounded-2xl bg-black/5 dark:bg-white/10 font-medium active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 rounded-2xl bg-accent-red text-white font-medium active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
