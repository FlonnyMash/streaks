import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { GlassModal } from '@/components/ui/GlassModal'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import type { OutboxPayload, PendingMutation } from '@/lib/offline/types'

function formatWhen(isoOrMs: string | number | null | undefined): string {
  if (isoOrMs == null) return 'Unknown time'
  const date = typeof isoOrMs === 'number' ? new Date(isoOrMs) : parseISO(isoOrMs)
  if (!isValid(date)) return 'Unknown time'
  const absolute = format(date, 'MMM d, yyyy · HH:mm')
  const relative = formatDistanceToNow(date, { addSuffix: true })
  return `${absolute} (${relative})`
}

function localActionLabel(payload: OutboxPayload): string {
  switch (payload.kind) {
    case 'streak_create':
      return `Created streak “${payload.input.name}”`
    case 'streak_update':
      return payload.input.name ? `Updated streak “${payload.input.name}”` : 'Updated a streak'
    case 'streak_delete':
      return 'Deleted a streak'
    case 'streak_archive':
      return 'Archived a streak'
    case 'streak_entry_toggle':
      return payload.completed ? 'Marked a day complete' : 'Unmarked a day'
    case 'streak_entry_minutes':
      return `Logged ${payload.minutes} minutes`
    case 'streak_entry_details':
      return 'Updated a day’s note or mood'
    case 'todo_create':
      return `Created todo “${payload.input.title}”`
    case 'todo_update':
      return payload.input.title ? `Updated todo “${payload.input.title}”` : 'Updated a todo'
    case 'todo_delete':
      return 'Deleted a todo'
    case 'todo_toggle':
      return payload.done ? 'Marked a todo done' : 'Reopened a todo'
    case 'todo_swap':
      return 'Reordered todos'
    case 'timesheet_entry_create':
      return `Added a ${payload.input.minutes}-minute time entry`
    case 'timesheet_entry_update':
      return 'Updated a time entry'
    case 'timesheet_entry_delete':
      return 'Deleted a time entry'
  }
}

function serverTitle(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const row = snapshot as Record<string, unknown>
  if (typeof row.title === 'string' && row.title.trim()) return row.title
  if (typeof row.name === 'string' && row.name.trim()) return row.name
  if (typeof row.topic === 'string' && row.topic.trim()) return row.topic
  if (typeof row.entry_date === 'string') return `Entry on ${row.entry_date}`
  return null
}

function serverStatusLine(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const row = snapshot as Record<string, unknown>
  if (typeof row.done === 'boolean') return row.done ? 'Currently marked done' : 'Currently still open'
  if (typeof row.completed === 'boolean') {
    return row.completed ? 'Currently marked complete' : 'Currently not complete'
  }
  if (typeof row.minutes === 'number') return `${row.minutes} minutes on server`
  return null
}

function serverUpdatedAt(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const row = snapshot as Record<string, unknown>
  return typeof row.updated_at === 'string' ? row.updated_at : null
}

function VersionCard({
  heading,
  title,
  detail,
  whenLabel,
}: {
  heading: string
  title: string
  detail?: string | null
  whenLabel: string
}) {
  return (
    <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45 mb-2">
        {heading}
      </p>
      <p className="text-[15px] font-medium leading-snug">{title}</p>
      {detail ? (
        <p className="text-[13px] text-black/55 dark:text-white/55 mt-1 leading-snug">{detail}</p>
      ) : null}
      <p className="text-[12px] text-black/40 dark:text-white/40 mt-2.5">Last updated {whenLabel}</p>
    </div>
  )
}

function localSummary(conflict: PendingMutation) {
  return {
    title: localActionLabel(conflict.payload),
    when: formatWhen(conflict.createdAt),
  }
}

function serverSummary(conflict: PendingMutation) {
  const snapshot = conflict.serverSnapshot
  const title = serverTitle(snapshot) ?? 'This item on the server'
  const detail = serverStatusLine(snapshot)
  const when = formatWhen(serverUpdatedAt(snapshot))
  return { title, detail, when }
}

export function ConflictResolveModal() {
  const { conflict, keepLocal, useServer, syncing } = useOfflineSync()
  const open = Boolean(conflict)
  const local = conflict ? localSummary(conflict) : null
  const server = conflict ? serverSummary(conflict) : null

  return (
    <GlassModal
      open={open}
      onClose={() => {
        /* must resolve explicitly */
      }}
      title="Sync conflict"
      className="app-desktop:max-w-lg"
    >
      <p className="text-sm text-black/60 dark:text-white/60 mb-4">
        This was changed on another device while you were offline. Choose which version to keep.
      </p>

      <div className="grid gap-3 app-desktop:grid-cols-2 mb-5">
        {local && (
          <VersionCard heading="Your device" title={local.title} whenLabel={local.when} />
        )}
        {server && (
          <VersionCard
            heading="Other device / server"
            title={server.title}
            detail={server.detail}
            whenLabel={server.when}
          />
        )}
      </div>

      <div className="flex flex-col app-desktop:flex-row gap-2">
        <button
          type="button"
          disabled={syncing || !conflict}
          onClick={() => conflict && void keepLocal(conflict.id)}
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
        >
          Keep mine
        </button>
        <button
          type="button"
          disabled={syncing || !conflict}
          onClick={() => conflict && void useServer(conflict.id)}
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold bg-black/8 dark:bg-white/10 disabled:opacity-50"
        >
          Use server
        </button>
      </div>
    </GlassModal>
  )
}
