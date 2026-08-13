import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  entityKeyFromPayload,
  metaFromPayload,
  type OutboxPayload,
  type PendingMutation,
} from '@/lib/offline/types'

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

const DB_NAME = 'mashed-outbox'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<OutboxDb>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OutboxDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('mutations', { keyPath: 'id' })
        store.createIndex('by-user', 'userId')
        store.createIndex('by-user-status', ['userId', 'status'])
        store.createIndex('by-coalesce', 'coalesceKey')
      },
    })
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
    // Create then delete → drop both (net no-op) if same client create id.
    if (
      coalescible.op === 'create' &&
      op === 'delete' &&
      (input.payload.kind === 'streak_delete' ||
        input.payload.kind === 'todo_delete' ||
        input.payload.kind === 'timesheet_entry_delete')
    ) {
      await db.delete('mutations', coalescible.id)
      notify()
      return coalescible
    }

    const updated: PendingMutation = {
      ...coalescible,
      payload: input.payload,
      entity,
      op,
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
