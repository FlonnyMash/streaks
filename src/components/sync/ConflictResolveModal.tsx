import { GlassModal } from '@/components/ui/GlassModal'
import { useOfflineSync } from '@/hooks/useOfflineSync'

function summarizeLocal(payload: ReturnType<typeof useOfflineSync>['conflict']): string {
  if (!payload) return ''
  const p = payload.payload
  return JSON.stringify(p, null, 2)
}

function summarizeServer(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== 'object') return 'No server row'
  const row = snapshot as Record<string, unknown>
  const pick: Record<string, unknown> = {}
  for (const key of [
    'id',
    'name',
    'title',
    'done',
    'completed',
    'minutes',
    'note',
    'mood',
    'entry_date',
    'updated_at',
  ]) {
    if (key in row) pick[key] = row[key]
  }
  return JSON.stringify(Object.keys(pick).length ? pick : row, null, 2)
}

export function ConflictResolveModal() {
  const { conflict, keepLocal, useServer, syncing } = useOfflineSync()
  const open = Boolean(conflict)

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
        This record changed on another device while you were offline. Keep your local changes or use
        the server version.
      </p>

      <div className="grid gap-3 app-desktop:grid-cols-2 mb-5">
        <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2">Your local change</p>
          <pre className="text-[11px] whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {summarizeLocal(conflict)}
          </pre>
        </div>
        <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2">Server version</p>
          <pre className="text-[11px] whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {summarizeServer(conflict?.serverSnapshot)}
          </pre>
        </div>
      </div>

      <div className="flex flex-col app-desktop:flex-row gap-2">
        <button
          type="button"
          disabled={syncing || !conflict}
          onClick={() => conflict && void keepLocal(conflict.id)}
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
        >
          Keep local
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
