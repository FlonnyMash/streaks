import { enqueueMutation } from '@/lib/offline/outbox'
import { isLikelyNetworkError, isOnline, registerOutboxSync } from '@/lib/offline/network'
import type { OutboxPayload } from '@/lib/offline/types'

export class OutboxQueuedError extends Error {
  readonly queued = true as const
  constructor(message = 'Saved offline — will sync when online') {
    super(message)
    this.name = 'OutboxQueuedError'
  }
}

export function isOutboxQueuedError(error: unknown): error is OutboxQueuedError {
  return error instanceof OutboxQueuedError || (error as { queued?: boolean })?.queued === true
}

/**
 * Run a Supabase mutation online, or enqueue it when offline / on network failure.
 * Throws `OutboxQueuedError` after a successful enqueue so callers can skip rollback
 * when optimistic UI already applied.
 */
export async function runOrEnqueue<T>(options: {
  userId: string
  payload: OutboxPayload
  expectedUpdatedAt?: string | null
  run: () => Promise<T>
  /** When offline, return this instead of calling run (optimistic / client id result). */
  offlineResult?: T
}): Promise<T> {
  const enqueue = async () => {
    await enqueueMutation({
      userId: options.userId,
      payload: options.payload,
      expectedUpdatedAt: options.expectedUpdatedAt,
    })
    await registerOutboxSync()
  }

  if (!isOnline()) {
    await enqueue()
    if (options.offlineResult !== undefined) return options.offlineResult
    throw new OutboxQueuedError()
  }

  try {
    return await options.run()
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      await enqueue()
      if (options.offlineResult !== undefined) return options.offlineResult
      throw new OutboxQueuedError()
    }
    throw error
  }
}
