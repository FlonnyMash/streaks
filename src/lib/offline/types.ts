import type { Mood, StreakInput, TodoInput } from '@/lib/types'

export type OutboxEntity =
  | 'streak'
  | 'streak_entry'
  | 'todo'

export type OutboxOp =
  | 'create'
  | 'update'
  | 'delete'
  | 'upsert'
  | 'toggle'
  | 'swap_positions'

export type OutboxStatus = 'pending' | 'conflict' | 'failed'

export type OutboxPayload =
  | { kind: 'streak_create'; input: StreakInput; clientId: string }
  | { kind: 'streak_update'; id: string; input: Partial<StreakInput> }
  | { kind: 'streak_delete'; id: string }
  | { kind: 'streak_archive'; id: string }
  | {
      kind: 'streak_entry_toggle'
      streakId: string
      dateKey: string
      completed: boolean
      clientId?: string
    }
  | {
      kind: 'streak_entry_minutes'
      streakId: string
      dateKey: string
      minutes: number
      completed: boolean
      clientId?: string
    }
  | {
      kind: 'streak_entry_details'
      streakId: string
      dateKey: string
      note: string | null
      mood: Mood | null
    }
  | {
      kind: 'todo_create'
      input: TodoInput
      clientId: string
      position: number
      /** Merged from a later offline toggle before the create was flushed. */
      done?: boolean
      completed_at?: string | null
      tracked_minutes?: number | null
    }
  | {
      kind: 'todo_update'
      id: string
      input: Partial<TodoInput>
      /** Merged from a later offline toggle before the update was flushed. */
      done?: boolean
      completed_at?: string | null
      tracked_minutes?: number | null
    }
  | { kind: 'todo_delete'; id: string }
  | {
      kind: 'todo_toggle'
      id: string
      done: boolean
      tracked_minutes?: number | null
      completed_at: string | null
    }
  | {
      kind: 'todo_swap'
      aId: string
      bId: string
      aPosition: number
      bPosition: number
    }

export interface PendingMutation {
  id: string
  createdAt: number
  userId: string
  entity: OutboxEntity
  op: OutboxOp
  /** Stable key for coalescing successive edits to the same row. */
  coalesceKey: string
  payload: OutboxPayload
  expectedUpdatedAt?: string | null
  status: OutboxStatus
  error?: string
  /** Server row snapshot when status is conflict. */
  serverSnapshot?: unknown
}

export const OUTBOX_SYNC_TAG = 'outbox-flush'
export const OUTBOX_FLUSH_MESSAGE = 'OUTBOX_FLUSH' as const

export function entityKeyFromPayload(payload: OutboxPayload): string {
  switch (payload.kind) {
    case 'streak_create':
      return `streak:${payload.clientId}`
    case 'streak_update':
    case 'streak_delete':
    case 'streak_archive':
      return `streak:${payload.id}`
    case 'streak_entry_toggle':
    case 'streak_entry_minutes':
    case 'streak_entry_details':
      return `streak_entry:${payload.streakId}:${payload.dateKey}`
    case 'todo_create':
      return `todo:${payload.clientId}`
    case 'todo_update':
    case 'todo_delete':
    case 'todo_toggle':
      return `todo:${payload.id}`
    case 'todo_swap':
      return `todo_swap:${[payload.aId, payload.bId].sort().join(':')}`
  }
}

export function metaFromPayload(payload: OutboxPayload): {
  entity: OutboxEntity
  op: OutboxOp
} {
  switch (payload.kind) {
    case 'streak_create':
      return { entity: 'streak', op: 'create' }
    case 'streak_update':
    case 'streak_archive':
      return { entity: 'streak', op: 'update' }
    case 'streak_delete':
      return { entity: 'streak', op: 'delete' }
    case 'streak_entry_toggle':
      return { entity: 'streak_entry', op: 'toggle' }
    case 'streak_entry_minutes':
      return { entity: 'streak_entry', op: 'upsert' }
    case 'streak_entry_details':
      return { entity: 'streak_entry', op: 'update' }
    case 'todo_create':
      return { entity: 'todo', op: 'create' }
    case 'todo_update':
      return { entity: 'todo', op: 'update' }
    case 'todo_delete':
      return { entity: 'todo', op: 'delete' }
    case 'todo_toggle':
      return { entity: 'todo', op: 'toggle' }
    case 'todo_swap':
      return { entity: 'todo', op: 'swap_positions' }
  }
}
