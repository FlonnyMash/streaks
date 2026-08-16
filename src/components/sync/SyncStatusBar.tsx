import { useState } from 'react'
import { CloudOff, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { ConflictResolveModal } from '@/components/sync/ConflictResolveModal'
import { cn } from '@/lib/utils'
import type { PendingMutation } from '@/lib/offline/types'

function labelFor(item: PendingMutation): string {
  const p = item.payload
  switch (p.kind) {
    case 'streak_create':
      return `Create streak “${p.input.name}”`
    case 'streak_update':
      return `Update streak`
    case 'streak_delete':
      return `Delete streak`
    case 'streak_archive':
      return `Archive streak`
    case 'streak_entry_toggle':
      return p.completed ? `Complete day ${p.dateKey}` : `Uncomplete day ${p.dateKey}`
    case 'streak_entry_minutes':
      return `Log ${p.minutes}m on ${p.dateKey}`
    case 'streak_entry_details':
      return `Update note/mood ${p.dateKey}`
    case 'todo_create':
      return `Create todo “${p.input.title}”`
    case 'todo_update':
      return `Update todo`
    case 'todo_delete':
      return `Delete todo`
    case 'todo_toggle':
      return p.done ? `Complete todo` : `Reopen todo`
    case 'todo_swap':
      return `Reorder todos`
    case 'timesheet_entry_create':
      return `Add ${p.input.minutes}m time entry`
    case 'timesheet_entry_update':
      return `Update time entry`
    case 'timesheet_entry_delete':
      return `Delete time entry`
  }
}

export function SyncStatusBar() {
  const { online, syncing, items, pendingCount, failedCount, conflict, flush, retry, discard } =
    useOfflineSync()
  const [expanded, setExpanded] = useState(false)

  const visible = !online || pendingCount > 0 || failedCount > 0 || syncing || Boolean(conflict)
  if (!visible) return <ConflictResolveModal />

  const canFlush = online && (pendingCount > 0 || failedCount > 0) && !syncing

  const summary = !online
    ? `Offline${pendingCount ? ` · ${pendingCount} pending` : ''}`
    : conflict
      ? 'Sync conflict — choose a version'
      : syncing
        ? 'Syncing…'
        : failedCount
          ? `${failedCount} sync failed`
          : pendingCount
            ? `${pendingCount} pending sync`
            : null

  return (
    <>
      {summary && (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-40 mx-auto w-full max-w-5xl safe-x [--safe-x-pad:1rem] app-desktop:[--safe-x-pad:1.5rem] pt-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              'w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-left',
              'glass-panel border border-black/8 dark:border-white/10',
              failedCount || conflict
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-black/70 dark:text-white/70',
            )}
          >
            {!online ? (
              <CloudOff className="size-4 shrink-0" />
            ) : failedCount || conflict ? (
              <AlertTriangle className="size-4 shrink-0" />
            ) : (
              <RefreshCw className={cn('size-4 shrink-0', syncing && 'animate-spin')} />
            )}
            <span className="flex-1 font-medium">{summary}</span>
            {canFlush && (
              <span
                role="button"
                tabIndex={0}
                className="text-xs underline underline-offset-2"
                onClick={(e) => {
                  e.stopPropagation()
                  void flush()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation()
                    void flush()
                  }
                }}
              >
                {failedCount ? 'Retry' : 'Sync now'}
              </span>
            )}
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {(expanded || failedCount > 0) && items.length > 0 && (
            <ul className="mt-1 rounded-2xl glass-panel border border-black/8 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 overflow-hidden">
              {items.map((item) => (
                <li key={item.id} className="px-3 py-2 flex items-start gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{labelFor(item)}</p>
                    <p className="text-xs text-black/50 dark:text-white/50 break-words">
                      {item.status}
                      {item.error ? ` · ${item.error}` : ''}
                    </p>
                  </div>
                  {item.status === 'failed' && online && (
                    <button
                      type="button"
                      className="text-xs font-medium underline underline-offset-2 shrink-0"
                      onClick={() => void retry(item.id)}
                    >
                      Retry
                    </button>
                  )}
                  {(item.status === 'failed' || item.status === 'pending') && (
                    <button
                      type="button"
                      className="text-xs font-medium text-black/50 dark:text-white/50 underline underline-offset-2 shrink-0"
                      onClick={() => void discard(item.id)}
                    >
                      Discard
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ConflictResolveModal />
    </>
  )
}
