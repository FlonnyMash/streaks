import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { syncTodoTopics } from '@/lib/todoTopics'
import {
  listOutbox,
  markOutboxFailed,
  removeOutboxItem,
  updateOutboxItem,
} from '@/lib/offline/outbox'
import type { OutboxPayload, PendingMutation } from '@/lib/offline/types'
import type {
  CalendarRoutine,
  CalendarRoutineInput,
  CalendarRoutineItem,
  CalendarRoutineItemInput,
  Streak,
  StreakInput,
  Todo,
  TodoInput,
} from '@/lib/types'
import {
  deleteOverlappingCalendarRoutineOverrides,
  fetchCalendarRoutineOverrideForDate,
  setCalendarRoutineSchedule,
} from '@/lib/calendarRoutinePacks'

export type FlushResult =
  | { status: 'idle' }
  | { status: 'done'; flushed: number }
  | { status: 'paused_conflict'; item: PendingMutation }
  | { status: 'error'; error: string }

let flushInFlight: Promise<FlushResult> | null = null

function invalidateDomain(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['streaks'] })
  void queryClient.invalidateQueries({ queryKey: ['streak-entries'] })
  void queryClient.invalidateQueries({ queryKey: ['todos'] })
  void queryClient.invalidateQueries({ queryKey: ['todo_topics'] })
  void queryClient.invalidateQueries({ queryKey: ['calendar-routines'] })
  void queryClient.invalidateQueries({ queryKey: ['calendar-routine-items'] })
  void queryClient.invalidateQueries({ queryKey: ['calendar-routine-logs'] })
  void queryClient.invalidateQueries({ queryKey: ['calendar-routine-override'] })
}

function formatError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; error_description?: string; code?: string; details?: string }
    const parts = [e.message, e.details, e.code ? `(${e.code})` : null].filter(Boolean)
    if (parts.length) return parts.join(' ')
  }
  return String(err)
}

function isDuplicateKey(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === '23505')
}

async function fetchRow(
  table:
    | 'streaks'
    | 'streak_entries'
    | 'todos'
    | 'calendar_routines'
    | 'calendar_routine_items'
    | 'calendar_routine_logs'
    | 'calendar_routine_overrides',
  match: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  let q = supabase.from(table).select('*')
  for (const [k, v] of Object.entries(match)) {
    q = q.eq(k, v)
  }
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return (data as Record<string, unknown> | null) ?? null
}

async function applyPayload(userId: string, payload: OutboxPayload): Promise<void> {
  switch (payload.kind) {
    case 'streak_create': {
      const row = {
        ...payload.input,
        id: payload.clientId,
        user_id: userId,
      }
      const { error } = await supabase.from('streaks').upsert(row, { onConflict: 'id' })
      if (error) throw error
      return
    }
    case 'streak_update': {
      const { error } = await supabase.from('streaks').update(payload.input).eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'streak_delete': {
      const { error } = await supabase.from('streaks').delete().eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'streak_archive': {
      const { error } = await supabase.from('streaks').update({ archived: true }).eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'streak_entry_toggle': {
      if (payload.completed) {
        const row: Record<string, unknown> = {
          streak_id: payload.streakId,
          user_id: userId,
          entry_date: payload.dateKey,
          completed: true,
        }
        if (payload.clientId) row.id = payload.clientId
        const { error } = await supabase
          .from('streak_entries')
          .upsert(row, { onConflict: 'streak_id,entry_date' })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('streak_entries')
          .delete()
          .eq('streak_id', payload.streakId)
          .eq('entry_date', payload.dateKey)
        if (error) throw error
      }
      return
    }
    case 'streak_entry_minutes': {
      const row: Record<string, unknown> = {
        streak_id: payload.streakId,
        user_id: userId,
        entry_date: payload.dateKey,
        minutes: payload.minutes,
        completed: payload.completed,
      }
      if (payload.clientId) row.id = payload.clientId
      const { error } = await supabase
        .from('streak_entries')
        .upsert(row, { onConflict: 'streak_id,entry_date' })
      if (error) throw error
      return
    }
    case 'streak_entry_details': {
      const { error } = await supabase
        .from('streak_entries')
        .update({ note: payload.note, mood: payload.mood })
        .eq('streak_id', payload.streakId)
        .eq('entry_date', payload.dateKey)
      if (error) throw error
      return
    }
    case 'todo_create': {
      const { topicNames, ...fields } = payload.input
      const row: Record<string, unknown> = {
        ...fields,
        id: payload.clientId,
        user_id: userId,
        position: payload.position,
      }
      if (payload.done !== undefined) row.done = payload.done
      if (payload.completed_at !== undefined) row.completed_at = payload.completed_at
      if (payload.tracked_minutes !== undefined) row.tracked_minutes = payload.tracked_minutes
      const { error } = await supabase.from('todos').upsert(row, { onConflict: 'id' })
      if (error) throw error
      await syncTodoTopics(userId, payload.clientId, topicNames ?? [])
      return
    }
    case 'todo_update': {
      const { topicNames, ...fields } = payload.input
      const body: Record<string, unknown> = { ...fields }
      if (payload.done !== undefined) body.done = payload.done
      if (payload.completed_at !== undefined) body.completed_at = payload.completed_at
      if (payload.tracked_minutes !== undefined) body.tracked_minutes = payload.tracked_minutes
      if (Object.keys(body).length > 0) {
        const { error } = await supabase.from('todos').update(body).eq('id', payload.id)
        if (error) throw error
      }
      if (topicNames !== undefined) {
        await syncTodoTopics(userId, payload.id, topicNames)
      }
      return
    }
    case 'todo_delete': {
      const { error } = await supabase.from('todos').delete().eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'todo_toggle': {
      const body: {
        done: boolean
        completed_at: string | null
        tracked_minutes?: number | null
      } = {
        done: payload.done,
        completed_at: payload.completed_at,
      }
      if (payload.tracked_minutes !== undefined) body.tracked_minutes = payload.tracked_minutes
      else if (!payload.done) body.tracked_minutes = null
      const { error } = await supabase.from('todos').update(body).eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'todo_swap': {
      const [{ error: errA }, { error: errB }] = await Promise.all([
        supabase.from('todos').update({ position: payload.bPosition }).eq('id', payload.aId),
        supabase.from('todos').update({ position: payload.aPosition }).eq('id', payload.bId),
      ])
      if (errA) throw errA
      if (errB) throw errB
      return
    }
    case 'calendar_routine_pack_create': {
      const row = {
        ...payload.input,
        id: payload.clientId,
        user_id: userId,
        position: payload.position,
      }
      const { error } = await supabase.from('calendar_routines').upsert(row, { onConflict: 'id' })
      if (error) throw error
      return
    }
    case 'calendar_routine_pack_update': {
      const { error } = await supabase.from('calendar_routines').update(payload.input).eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'calendar_routine_pack_archive': {
      const { error } = await supabase
        .from('calendar_routines')
        .update({ archived: true })
        .eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'calendar_routine_schedule_set': {
      await setCalendarRoutineSchedule(payload.routineId, payload.days)
      return
    }
    case 'calendar_routine_create': {
      const row = {
        ...payload.input,
        id: payload.clientId,
        user_id: userId,
        position: payload.position,
      }
      const { error } = await supabase.from('calendar_routine_items').upsert(row, { onConflict: 'id' })
      if (error) throw error
      return
    }
    case 'calendar_routine_item_update': {
      const { error } = await supabase
        .from('calendar_routine_items')
        .update(payload.input)
        .eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'calendar_routine_item_archive': {
      const { error } = await supabase
        .from('calendar_routine_items')
        .update({ archived: true })
        .eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'calendar_routine_toggle': {
      if (payload.completed) {
        const row: Record<string, unknown> = {
          item_id: payload.itemId,
          user_id: userId,
          entry_date: payload.dateKey,
          completed: true,
        }
        if (payload.clientId) row.id = payload.clientId
        const { error } = await supabase
          .from('calendar_routine_logs')
          .upsert(row, { onConflict: 'item_id,entry_date' })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('calendar_routine_logs')
          .delete()
          .eq('item_id', payload.itemId)
          .eq('entry_date', payload.dateKey)
        if (error) throw error
      }
      return
    }
    case 'calendar_routine_override_set': {
      await deleteOverlappingCalendarRoutineOverrides(userId, payload.startDate, payload.endDate)
      const row: Record<string, unknown> = {
        id: payload.clientId,
        user_id: userId,
        start_date: payload.startDate,
        end_date: payload.endDate,
        routine_id: payload.routineId,
      }
      const { error } = await supabase.from('calendar_routine_overrides').insert(row)
      if (error) throw error
      return
    }
    case 'calendar_routine_override_clear': {
      const { error } = await supabase
        .from('calendar_routine_overrides')
        .delete()
        .eq('user_id', userId)
        .lte('start_date', payload.dateKey)
        .or(`end_date.is.null,end_date.gte.${payload.dateKey}`)
      if (error) throw error
      return
    }
  }
}

/**
 * If an update/toggle targets a row that only exists in the local cache
 * (offline create was discarded, or coalesce lost the create), rebuild a create.
 */
async function recoverMissingFromCache(
  userId: string,
  item: PendingMutation,
  queryClient: QueryClient,
): Promise<boolean> {
  const p = item.payload

  if (p.kind === 'todo_update' || p.kind === 'todo_toggle') {
    const todos = queryClient.getQueryData<Todo[]>(['todos', userId])
    const local = todos?.find((t) => t.id === p.id)
    if (!local) return false

    const input: TodoInput = {
      title: local.title,
      notes: local.notes,
      due_date: local.due_date,
      importance: local.importance,
      notify_enabled: local.notify_enabled,
      routine: local.routine,
      estimated_minutes: local.estimated_minutes,
      topicNames: local.topics.map((t) => t.name),
    }
    if (p.kind === 'todo_update') {
      Object.assign(input, p.input)
    }

    await applyPayload(userId, {
      kind: 'todo_create',
      clientId: local.id,
      position: local.position,
      input,
      done: p.kind === 'todo_toggle' ? p.done : (p.done ?? local.done),
      completed_at:
        p.kind === 'todo_toggle'
          ? p.completed_at
          : (p.completed_at !== undefined ? p.completed_at : local.completed_at),
      tracked_minutes:
        p.kind === 'todo_toggle'
          ? p.tracked_minutes
          : (p.tracked_minutes !== undefined ? p.tracked_minutes : local.tracked_minutes),
    })
    return true
  }

  if (p.kind === 'calendar_routine_pack_update') {
    const packs = queryClient.getQueryData<CalendarRoutine[]>(['calendar-routines', userId])
    const local = packs?.find((r) => r.id === p.id)
    if (!local) return false
    const input: CalendarRoutineInput = {
      name: local.name,
      emoji: local.emoji,
      auto_apply_days: local.auto_apply_days,
      ...p.input,
    }
    await applyPayload(userId, { kind: 'calendar_routine_pack_create', clientId: local.id, position: local.position, input })
    return true
  }

  if (p.kind === 'calendar_routine_item_update') {
    const items = queryClient.getQueryData<CalendarRoutineItem[]>(['calendar-routine-items', userId])
    const local = items?.find((i) => i.id === p.id)
    if (!local) return false
    const input: CalendarRoutineItemInput = {
      routine_id: local.routine_id,
      title: local.title,
      emoji: local.emoji,
      block: local.block,
      estimated_minutes: local.estimated_minutes,
      ...p.input,
    }
    await applyPayload(userId, {
      kind: 'calendar_routine_create',
      clientId: local.id,
      position: local.position,
      input,
    })
    return true
  }

  if (p.kind === 'streak_update') {
    const streaks = queryClient.getQueryData<Streak[]>(['streaks', userId])
    const local = streaks?.find((s) => s.id === p.id)
    if (!local) return false
    const input: StreakInput = {
      name: local.name,
      emoji: local.emoji,
      color: local.color,
      frequency_type: local.frequency_type,
      target_weekdays: local.target_weekdays,
      target_count: local.target_count,
      track_time: local.track_time,
      time_goal_minutes: local.time_goal_minutes,
      time_goal_period: local.time_goal_period,
      notify_enabled: local.notify_enabled,
      notify_time: local.notify_time,
      ...p.input,
    }
    await applyPayload(userId, { kind: 'streak_create', clientId: local.id, input })
    return true
  }

  return false
}

async function checkConflict(item: PendingMutation): Promise<'ok' | 'skip' | 'missing'> {
  const p = item.payload
  switch (p.kind) {
    case 'streak_create':
    case 'todo_create':
    case 'todo_swap':
    case 'streak_entry_minutes':
    case 'calendar_routine_pack_create':
    case 'calendar_routine_create':
    case 'calendar_routine_override_set':
    case 'calendar_routine_schedule_set':
      return 'ok'
    case 'calendar_routine_pack_update': {
      const row = await fetchRow('calendar_routines', { id: p.id })
      return row ? 'ok' : 'missing'
    }
    case 'calendar_routine_pack_archive': {
      const row = await fetchRow('calendar_routines', { id: p.id })
      return row ? 'ok' : 'skip'
    }
    case 'calendar_routine_item_update': {
      const row = await fetchRow('calendar_routine_items', { id: p.id })
      return row ? 'ok' : 'missing'
    }
    case 'calendar_routine_item_archive': {
      const row = await fetchRow('calendar_routine_items', { id: p.id })
      return row ? 'ok' : 'skip'
    }
    case 'calendar_routine_override_clear': {
      const row = await fetchCalendarRoutineOverrideForDate(p.dateKey)
      return row ? 'ok' : 'skip'
    }
    case 'calendar_routine_toggle': {
      if (!p.completed) {
        const row = await fetchRow('calendar_routine_logs', {
          item_id: p.itemId,
          entry_date: p.dateKey,
        })
        if (!row) return 'skip'
      }
      return 'ok'
    }
    case 'streak_entry_toggle': {
      if (!p.completed) {
        const row = await fetchRow('streak_entries', {
          streak_id: p.streakId,
          entry_date: p.dateKey,
        })
        if (!row) return 'skip'
      }
      return 'ok'
    }
    case 'streak_entry_details': {
      const row = await fetchRow('streak_entries', {
        streak_id: p.streakId,
        entry_date: p.dateKey,
      })
      return row ? 'ok' : 'skip'
    }
    case 'streak_update': {
      const row = await fetchRow('streaks', { id: p.id })
      return row ? 'ok' : 'missing'
    }
    case 'streak_archive': {
      const row = await fetchRow('streaks', { id: p.id })
      return row ? 'ok' : 'skip'
    }
    case 'streak_delete': {
      const row = await fetchRow('streaks', { id: p.id })
      return row ? 'ok' : 'skip'
    }
    case 'todo_update':
    case 'todo_toggle': {
      const row = await fetchRow('todos', { id: p.id })
      return row ? 'ok' : 'missing'
    }
    case 'todo_delete': {
      const row = await fetchRow('todos', { id: p.id })
      return row ? 'ok' : 'skip'
    }
  }
}

async function flushOnce(userId: string, queryClient: QueryClient): Promise<FlushResult> {
  const items = await listOutbox(userId)
  const pending = items.filter(
    (i) => i.status === 'pending' || i.status === 'failed' || i.status === 'conflict',
  )
  if (pending.length === 0) return { status: 'idle' }

  let flushed = 0
  let lastError: string | null = null

  for (const item of pending) {
    try {
      const existence = await checkConflict(item)

      if (existence === 'skip') {
        await removeOutboxItem(item.id)
        flushed++
        continue
      }

      if (existence === 'missing') {
        const recovered = await recoverMissingFromCache(userId, item, queryClient)
        if (recovered) {
          await removeOutboxItem(item.id)
          flushed++
          continue
        }
        await markOutboxFailed(item.id, 'Item no longer exists on server')
        lastError = 'Item no longer exists on server'
        continue
      }

      try {
        await applyPayload(userId, item.payload)
      } catch (err) {
        // Create may have partially succeeded on an earlier attempt.
        if (isDuplicateKey(err) && item.payload.kind.endsWith('_create')) {
          await removeOutboxItem(item.id)
          flushed++
          continue
        }
        throw err
      }

      await removeOutboxItem(item.id)
      flushed++
    } catch (err) {
      const message = formatError(err)
      // eslint-disable-next-line no-console
      console.error('[outbox] flush item failed', item.payload.kind, err)
      await markOutboxFailed(item.id, message)
      lastError = message
      // Keep going so one bad item doesn't block the rest of the queue.
    }
  }

  if (flushed > 0) invalidateDomain(queryClient)
  if (lastError && flushed === 0) return { status: 'error', error: lastError }
  return { status: 'done', flushed }
}

export async function flushOutbox(userId: string, queryClient: QueryClient): Promise<FlushResult> {
  if (flushInFlight) return flushInFlight
  flushInFlight = flushOnce(userId, queryClient).finally(() => {
    flushInFlight = null
  })
  return flushInFlight
}

/** Force-apply a conflicted item (Keep local), then continue flush. */
export async function resolveConflictKeepLocal(
  itemId: string,
  userId: string,
  queryClient: QueryClient,
): Promise<FlushResult> {
  const items = await listOutbox(userId)
  const item = items.find((i) => i.id === itemId)
  if (!item) return flushOutbox(userId, queryClient)

  try {
    await applyPayload(userId, item.payload)
    await removeOutboxItem(item.id)
    invalidateDomain(queryClient)
  } catch (err) {
    const message = formatError(err)
    await markOutboxFailed(item.id, message)
    return { status: 'error', error: message }
  }
  return flushOutbox(userId, queryClient)
}

/** Discard local change (Use server), invalidate, continue flush. */
export async function resolveConflictUseServer(
  itemId: string,
  userId: string,
  queryClient: QueryClient,
): Promise<FlushResult> {
  await removeOutboxItem(itemId)
  invalidateDomain(queryClient)
  return flushOutbox(userId, queryClient)
}

export async function retryFailedItem(
  itemId: string,
  userId: string,
  queryClient: QueryClient,
): Promise<FlushResult> {
  const items = await listOutbox(userId)
  const item = items.find((i) => i.id === itemId)
  if (item) {
    await updateOutboxItem({
      ...item,
      status: 'pending',
      error: undefined,
      serverSnapshot: undefined,
    })
  }
  return flushOutbox(userId, queryClient)
}
