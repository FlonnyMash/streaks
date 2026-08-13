import { OUTBOX_SYNC_TAG } from '@/lib/offline/types'

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (!isOnline()) return true
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed') ||
      msg.includes('fetch')
    )
  }
  if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; status?: number; name?: string }
    if (e.name === 'AbortError') return true
    if (typeof e.status === 'number' && e.status === 0) return true
    const msg = (e.message ?? '').toLowerCase()
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('offline')) {
      return true
    }
    // PostgREST / supabase sometimes wrap fetch failures
    if (e.code === 'PGRST301' || e.code === 'NETWORK_ERROR') return true
  }
  return false
}

/** Ask the SW to wake us when connectivity returns (Chromium). */
export async function registerOutboxSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const syncManager = (
      reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> }
      }
    ).sync
    if (syncManager) {
      await syncManager.register(OUTBOX_SYNC_TAG)
    }
  } catch {
    // Background Sync is optional; online listener still flushes.
  }
}

export function subscribeOnline(listener: () => void): () => void {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}
