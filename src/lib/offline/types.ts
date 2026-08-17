import type { CalendarRoutineInput, CalendarRoutineItemInput, Mood, StreakInput, TodoInput } from '@/lib/types'

export type OutboxEntity =
  | 'streak'
  | 'streak_entry'
  | 'todo'
  | 'calendar_routine'
  | 'calendar_routine_item'
  | 'calendar_routine_log'
  | 'calendar_routine_override'

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
  | { kind: 'calendar_routine_pack_create'; input: CalendarRoutineInput; clientId: string; position: number }
  | { kind: 'calendar_routine_pack_update'; id: string; input: Partial<CalendarRoutineInput> }
  | { kind: 'calendar_routine_pack_archive'; id: string }
  | { kind: 'calendar_routine_create'; input: CalendarRoutineItemInput; clientId: string; position: number }
  | { kind: 'calendar_routine_item_update'; id: string; input: Partial<CalendarRoutineItemInput> }
  | { kind: 'calendar_routine_item_archive'; id: string }
  | {
      kind: 'calendar_routine_toggle'
      itemId: string
      dateKey: string
      completed: boolean
      clientId?: string
    }
  | {
      kind: 'calendar_routine_schedule_set'
      routineId: string
      days: number[]
    }
  | {
      kind: 'calendar_routine_override_set'
      routineId: string | null
      startDate: string
      endDate: string | null
      clientId: string
    }
  | { kind: 'calendar_routine_override_clear'; dateKey: string }

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
    case 'calendar_routine_pack_create':
      return `calendar_routine:${payload.clientId}`
    case 'calendar_routine_pack_update':
    case 'calendar_routine_pack_archive':
      return `calendar_routine:${payload.id}`
    case 'calendar_routine_schedule_set':
      return `calendar_routine_schedule:${payload.routineId}`
    case 'calendar_routine_create':
      return `calendar_routine_item:${payload.clientId}`
    case 'calendar_routine_item_update':
    case 'calendar_routine_item_archive':
      return `calendar_routine_item:${payload.id}`
    case 'calendar_routine_toggle':
      return `calendar_routine_log:${payload.itemId}:${payload.dateKey}`
    case 'calendar_routine_override_set':
      return `calendar_routine_override:${payload.clientId}`
    case 'calendar_routine_override_clear':
      return `calendar_routine_override:clear:${payload.dateKey}`
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
    case 'calendar_routine_pack_create':
      return { entity: 'calendar_routine', op: 'create' }
    case 'calendar_routine_pack_update':
      return { entity: 'calendar_routine', op: 'update' }
    case 'calendar_routine_schedule_set':
      return { entity: 'calendar_routine', op: 'update' }
    case 'calendar_routine_pack_archive':
      return { entity: 'calendar_routine', op: 'update' }
    case 'calendar_routine_create':
      return { entity: 'calendar_routine_item', op: 'create' }
    case 'calendar_routine_item_update':
      return { entity: 'calendar_routine_item', op: 'update' }
    case 'calendar_routine_item_archive':
      return { entity: 'calendar_routine_item', op: 'update' }
    case 'calendar_routine_toggle':
      return { entity: 'calendar_routine_log', op: 'toggle' }
    case 'calendar_routine_override_set':
      return { entity: 'calendar_routine_override', op: 'create' }
    case 'calendar_routine_override_clear':
      return { entity: 'calendar_routine_override', op: 'delete' }
  }
}
