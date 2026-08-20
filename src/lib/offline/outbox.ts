import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  entityKeyFromPayload,
  metaFromPayload,
  type OutboxPayload,
  type PendingMutation,
} from '@/lib/offline/types'
import { ensureLegacyBrowserStorageMigrated, OUTBOX_DB_NAME } from '@/lib/legacyBrowserStorage'

interface OutboxDb extends DBSchema {
  mutations: {
    key: string
    value: PendingMutation
    indexes: {
      'by-user': string
      'by-user-status': [string, string]
      'by-coalesce': string
    }
  }
}

const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<OutboxDb>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = ensureLegacyBrowserStorageMigrated().then(() =>
      openDB<OutboxDb>(OUTBOX_DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (db.objectStoreNames.contains('mutations')) return
          const store = db.createObjectStore('mutations', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-user-status', ['userId', 'status'])
          store.createIndex('by-coalesce', 'coalesceKey')
        },
      }),
    )
  }
  return dbPromise
}

type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  for (const listener of listeners) listener()
}

export async function listOutbox(userId: string): Promise<PendingMutation[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('mutations', 'by-user', userId)
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getOutboxItem(id: string): Promise<PendingMutation | undefined> {
  const db = await getDb()
  return db.get('mutations', id)
}

function isDeletePayload(payload: OutboxPayload): boolean {
  return (
    payload.kind === 'streak_delete' ||
    payload.kind === 'todo_delete' ||
    payload.kind === 'calendar_routine_pack_archive' ||
    payload.kind === 'calendar_routine_item_archive'
  )
}

/**
 * Merge successive mutations on the same entity into one outbox payload.
 * Critical: create + later update/toggle must stay a create, otherwise flush
 * tries to update a row that was never inserted.
 */
function mergePayloads(existing: OutboxPayload, incoming: OutboxPayload): OutboxPayload | 'cancel' {
  if (existing.kind.endsWith('_create') && isDeletePayload(incoming)) {
    return 'cancel'
  }

  // --- todos ---
  if (existing.kind === 'todo_create') {
    if (incoming.kind === 'todo_update' && incoming.id === existing.clientId) {
      return {
        ...existing,
        input: { ...existing.input, ...incoming.input },
        done: incoming.done ?? existing.done,
        completed_at: incoming.completed_at !== undefined ? incoming.completed_at : existing.completed_at,
        tracked_minutes:
          incoming.tracked_minutes !== undefined ? incoming.tracked_minutes : existing.tracked_minutes,
      }
    }
    if (incoming.kind === 'todo_toggle' && incoming.id === existing.clientId) {
      return {
        ...existing,
        done: incoming.done,
        completed_at: incoming.completed_at,
        tracked_minutes:
          incoming.tracked_minutes !== undefined ? incoming.tracked_minutes : existing.tracked_minutes,
      }
    }
  }

  if (existing.kind === 'todo_update') {
    if (incoming.kind === 'todo_update' && incoming.id === existing.id) {
      return {
        ...existing,
        input: { ...existing.input, ...incoming.input },
        done: incoming.done ?? existing.done,
        completed_at: incoming.completed_at !== undefined ? incoming.completed_at : existing.completed_at,
        tracked_minutes:
          incoming.tracked_minutes !== undefined ? incoming.tracked_minutes : existing.tracked_minutes,
      }
    }
    if (incoming.kind === 'todo_toggle' && incoming.id === existing.id) {
      return {
        ...existing,
        done: incoming.done,
        completed_at: incoming.completed_at,
        tracked_minutes:
          incoming.tracked_minutes !== undefined ? incoming.tracked_minutes : existing.tracked_minutes,
      }
    }
  }

  if (existing.kind === 'todo_toggle' && incoming.kind === 'todo_update' && incoming.id === existing.id) {
    return {
      kind: 'todo_update',
      id: existing.id,
      input: incoming.input,
      done: existing.done,
      completed_at: existing.completed_at,
      tracked_minutes: existing.tracked_minutes,
    }
  }

  if (existing.kind === 'todo_toggle' && incoming.kind === 'todo_toggle' && incoming.id === existing.id) {
    return incoming
  }

  // --- streaks ---
  if (existing.kind === 'streak_create' && incoming.kind === 'streak_update' && incoming.id === existing.clientId) {
    return {
      ...existing,
      input: { ...existing.input, ...incoming.input },
    }
  }

  if (existing.kind === 'streak_update' && incoming.kind === 'streak_update' && incoming.id === existing.id) {
    return {
      ...existing,
      input: { ...existing.input, ...incoming.input },
    }
  }

  if (existing.kind === 'streak_create' && incoming.kind === 'streak_archive' && incoming.id === existing.clientId) {
    // Creating then archiving before sync → net no-op for the server.
    return 'cancel'
  }

  // --- calendar routine packs ---
  if (
    existing.kind === 'calendar_routine_pack_create' &&
    incoming.kind === 'calendar_routine_pack_update' &&
    incoming.id === existing.clientId
  ) {
    return {
      ...existing,
      input: { ...existing.input, ...incoming.input },
    }
  }

  if (
    existing.kind === 'calendar_routine_pack_update' &&
    incoming.kind === 'calendar_routine_pack_update' &&
    incoming.id === existing.id
  ) {
    return {
      ...existing,
      input: { ...existing.input, ...incoming.input },
    }
  }

  if (existing.kind === 'calendar_routine_schedule_set' && incoming.kind === 'calendar_routine_schedule_set') {
    return incoming
  }

  // --- calendar routine items ---
  if (
    existing.kind === 'calendar_routine_create' &&
    incoming.kind === 'calendar_routine_item_update' &&
    incoming.id === existing.clientId
  ) {
    return {
      ...existing,
      input: { ...existing.input, ...incoming.input },
    }
  }

  if (
    existing.kind === 'calendar_routine_item_update' &&
    incoming.kind === 'calendar_routine_item_update' &&
    incoming.id === existing.id
  ) {
    return {
      ...existing,
      input: { ...existing.input, ...incoming.input },
    }
  }

  // --- streak entries: last write wins (toggle / minutes / details share coalesce key) ---
  if (
    (existing.kind === 'streak_entry_toggle' ||
      existing.kind === 'streak_entry_minutes' ||
      existing.kind === 'streak_entry_details') &&
    (incoming.kind === 'streak_entry_toggle' ||
      incoming.kind === 'streak_entry_minutes' ||
      incoming.kind === 'streak_entry_details')
  ) {
    return incoming
  }

  // Default: replace with the latest mutation (keeps expectedUpdatedAt from first base).
  return incoming
}

export async function enqueueMutation(input: {
  userId: string
  payload: OutboxPayload
  expectedUpdatedAt?: string | null
}): Promise<PendingMutation> {
  const db = await getDb()
  const coalesceKey = `${input.userId}:${entityKeyFromPayload(input.payload)}`
  const { entity, op } = metaFromPayload(input.payload)

  const existing = await db.getAllFromIndex('mutations', 'by-coalesce', coalesceKey)
  const coalescible = existing.find((m) => m.status === 'pending' || m.status === 'failed')

  if (coalescible) {
    const merged = mergePayloads(coalescible.payload, input.payload)
    if (merged === 'cancel') {
      await db.delete('mutations', coalescible.id)
      notify()
      return coalescible
    }

    const meta = metaFromPayload(merged)
    const updated: PendingMutation = {
      ...coalescible,
      payload: merged,
      entity: meta.entity,
      op: meta.op,
      // Keep original expectedUpdatedAt so conflict detection stays vs first base.
      expectedUpdatedAt: coalescible.expectedUpdatedAt ?? input.expectedUpdatedAt,
      status: 'pending',
      error: undefined,
      serverSnapshot: undefined,
    }
    await db.put('mutations', updated)
    notify()
    return updated
  }

  const item: PendingMutation = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    userId: input.userId,
    entity,
    op,
    coalesceKey,
    payload: input.payload,
    expectedUpdatedAt: input.expectedUpdatedAt,
    status: 'pending',
  }
  await db.put('mutations', item)
  notify()
  return item
}

export async function updateOutboxItem(item: PendingMutation): Promise<void> {
  const db = await getDb()
  await db.put('mutations', item)
  notify()
}

export async function removeOutboxItem(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('mutations', id)
  notify()
}

export async function markOutboxFailed(id: string, error: string): Promise<void> {
  const db = await getDb()
  const item = await db.get('mutations', id)
  if (!item) return
  await db.put('mutations', { ...item, status: 'failed', error })
  notify()
}

export async function markOutboxConflict(
  id: string,
  serverSnapshot: unknown,
  error = 'Conflict with server version',
): Promise<void> {
  const db = await getDb()
  const item = await db.get('mutations', id)
  if (!item) return
  await db.put('mutations', {
    ...item,
    status: 'conflict',
    error,
    serverSnapshot,
  })
  notify()
}

export async function resetOutboxItemPending(id: string): Promise<void> {
  const db = await getDb()
  const item = await db.get('mutations', id)
  if (!item) return
  await db.put('mutations', {
    ...item,
    status: 'pending',
    error: undefined,
    serverSnapshot: undefined,
  })
  notify()
}
