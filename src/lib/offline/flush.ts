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
  void queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] })
}

async function fetchUpdatedAt(
  table: 'streaks' | 'streak_entries' | 'todos' | 'timesheet_entries',
  match: Record<string, string>,
): Promise<{ row: Record<string, unknown> | null; updatedAt: string | null }> {
  let q = supabase.from(table).select('*')
  for (const [k, v] of Object.entries(match)) {
    q = q.eq(k, v)
  }
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  const row = (data as Record<string, unknown> | null) ?? null
  return {
    row,
    updatedAt: row && typeof row.updated_at === 'string' ? row.updated_at : null,
  }
}

async function applyPayload(userId: string, payload: OutboxPayload): Promise<void> {
  switch (payload.kind) {
    case 'streak_create': {
      const { error } = await supabase.from('streaks').insert({
        ...payload.input,
        id: payload.clientId,
        user_id: userId,
      })
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
      const { error } = await supabase.from('todos').insert(row)
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
    case 'timesheet_entry_create': {
      const { error } = await supabase.from('timesheet_entries').insert({
        ...payload.input,
        id: payload.clientId,
        workspace_id: payload.workspaceId,
        user_id: userId,
      })
      if (error) throw error
      return
    }
    case 'timesheet_entry_update': {
      const { error } = await supabase
        .from('timesheet_entries')
        .update(payload.input)
        .eq('id', payload.id)
      if (error) throw error
      return
    }
    case 'timesheet_entry_delete': {
      const { error } = await supabase.from('timesheet_entries').delete().eq('id', payload.id)
      if (error) throw error
      return
    }
  }
}

async function checkConflict(item: PendingMutation): Promise<'ok' | 'skip' | 'missing'> {
  const p = item.payload
  switch (p.kind) {
    case 'streak_create':
    case 'todo_create':
    case 'timesheet_entry_create':
    case 'todo_swap':
    case 'streak_entry_minutes':
      return 'ok'
    case 'streak_entry_toggle': {
      if (!p.completed) {
        const { row } = await fetchUpdatedAt('streak_entries', {
          streak_id: p.streakId,
          entry_date: p.dateKey,
        })
        if (!row) return 'skip'
      }
      return 'ok'
    }
    case 'streak_entry_details': {
      const { row } = await fetchUpdatedAt('streak_entries', {
        streak_id: p.streakId,
        entry_date: p.dateKey,
      })
      return row ? 'ok' : 'skip'
    }
    case 'streak_update': {
      const { row } = await fetchUpdatedAt('streaks', { id: p.id })
      return row ? 'ok' : 'missing'
    }
    case 'streak_archive': {
      const { row } = await fetchUpdatedAt('streaks', { id: p.id })
      return row ? 'ok' : 'skip'
    }
    case 'streak_delete': {
      const { row } = await fetchUpdatedAt('streaks', { id: p.id })
      return row ? 'ok' : 'skip'
    }
    case 'todo_update':
    case 'todo_toggle': {
      const { row } = await fetchUpdatedAt('todos', { id: p.id })
      return row ? 'ok' : 'missing'
    }
    case 'todo_delete': {
      const { row } = await fetchUpdatedAt('todos', { id: p.id })
      return row ? 'ok' : 'skip'
    }
    case 'timesheet_entry_update': {
      const { row } = await fetchUpdatedAt('timesheet_entries', { id: p.id })
      return row ? 'ok' : 'missing'
    }
    case 'timesheet_entry_delete': {
      const { row } = await fetchUpdatedAt('timesheet_entries', { id: p.id })
      return row ? 'ok' : 'skip'
    }
  }
}

async function flushOnce(userId: string, queryClient: QueryClient): Promise<FlushResult> {
  const items = await listOutbox(userId)
  // Include prior conflicts so a reconnect can clear a stuck queue without
  // forcing the user through Sync now + conflict UI for offline edits.
  const pending = items.filter(
    (i) => i.status === 'pending' || i.status === 'failed' || i.status === 'conflict',
  )
  if (pending.length === 0) return { status: 'idle' }

  let flushed = 0

  for (const item of pending) {
    try {
      if (item.status === 'conflict') {
        // Stuck conflict from an earlier failed sync — keep local when possible.
        const existence = await checkConflict(item)
        if (existence === 'missing') {
          await markOutboxFailed(item.id, 'Item no longer exists on server')
          continue
        }
        if (existence === 'skip') {
          await removeOutboxItem(item.id)
          flushed++
          continue
        }
        await applyPayload(userId, item.payload)
        await removeOutboxItem(item.id)
        flushed++
        continue
      }

      const conflict = await checkConflict(item)
      if (conflict === 'skip') {
        await removeOutboxItem(item.id)
        flushed++
        continue
      }
      if (conflict === 'missing') {
        await markOutboxFailed(item.id, 'Item no longer exists on server')
        continue
      }
      await applyPayload(userId, item.payload)
      await removeOutboxItem(item.id)
      flushed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await markOutboxFailed(item.id, message)
      if (flushed > 0) invalidateDomain(queryClient)
      return { status: 'error', error: message }
    }
  }

  if (flushed > 0) invalidateDomain(queryClient)
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
    const message = err instanceof Error ? err.message : String(err)
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
