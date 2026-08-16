import { useEffect, useRef, useState } from 'react'
import { CloudOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'
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

interface SyncStatusButtonProps {
  /** Match the avatar frame: mobile `sm`, desktop `md`. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Compact sync indicator — same footprint as the profile avatar.
 * Hidden when online with an empty outbox.
 */
export function SyncStatusButton({ size = 'md', className }: SyncStatusButtonProps) {
  const { online, syncing, items, pendingCount, failedCount, conflict, flush, retry, discard } =
    useOfflineSync()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const visible = !online || pendingCount > 0 || failedCount > 0 || syncing || Boolean(conflict)
  const canFlush = online && (pendingCount > 0 || failedCount > 0) && !syncing
  const attention = failedCount > 0 || Boolean(conflict)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!visible) setOpen(false)
  }, [visible])

  if (!visible) return null

  const label = !online
    ? `Offline${pendingCount ? `, ${pendingCount} pending` : ''}`
    : conflict
      ? 'Sync conflict'
      : syncing
        ? 'Syncing'
        : failedCount
          ? `${failedCount} sync failed`
          : `${pendingCount} pending sync`

  const frame =
    size === 'sm'
      ? 'size-9'
      : 'size-14 landscape:size-12'

  const icon = size === 'sm' ? 'size-4' : 'size-5'

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all',
          'glass-surface shadow-[0_8px_20px_-10px_rgba(0,0,0,0.3)]',
          'hover:opacity-90 active:scale-95',
          frame,
          attention
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-black/55 dark:text-white/55',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent dark:from-white/16" />
        </span>
        <span className="relative z-10 flex items-center justify-center">
          {!online ? (
            <CloudOff className={icon} />
          ) : attention ? (
            <AlertTriangle className={icon} />
          ) : (
            <RefreshCw className={cn(icon, syncing && 'animate-spin')} />
          )}
        </span>
        {(pendingCount > 0 || failedCount > 0) && !syncing && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 z-20 flex items-center justify-center rounded-full',
              'min-w-4 h-4 px-1 text-[10px] font-bold leading-none',
              'bg-black text-white dark:bg-white dark:text-black',
              attention && 'bg-amber-600 text-white dark:bg-amber-400 dark:text-black',
            )}
          >
            {failedCount || pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Sync status"
          className={cn(
            'absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 max-w-[calc(100vw-1.5rem)]',
            'rounded-2xl glass-panel border border-black/8 dark:border-white/10',
            'shadow-[0_16px_40px_-18px_rgba(0,0,0,0.45)] overflow-hidden',
          )}
        >
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-black/5 dark:border-white/10">
            <p className="flex-1 text-sm font-medium text-black/80 dark:text-white/80">{label}</p>
            {canFlush && (
              <button
                type="button"
                className="text-xs font-semibold underline underline-offset-2 shrink-0"
                onClick={() => void flush()}
              >
                {failedCount ? 'Retry' : 'Sync now'}
              </button>
            )}
          </div>

          {items.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto divide-y divide-black/5 dark:divide-white/10">
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
          ) : (
            <p className="px-3 py-3 text-xs text-black/50 dark:text-white/50">
              {syncing ? 'Pushing your changes…' : 'Waiting for a connection.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
