import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type {
  CalendarRoutine,
  CalendarRoutineOverride,
  CalendarRoutineInput,
  CalendarRoutineItem,
  CalendarRoutineItemInput,
  CalendarRoutineLog,
} from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { runOrEnqueue, isOutboxQueuedError, isOutboxQueuedResult } from '@/lib/offline/runOrEnqueue'
import { isOnline } from '@/lib/offline/network'
import {
  deleteOverlappingCalendarRoutineOverrides,
  overrideCoversDate,
  overrideRangesOverlap,
  setCalendarRoutineSchedule,
} from '@/lib/calendarRoutinePacks'

const PACKS_KEY = ['calendar-routines'] as const
const ITEMS_KEY = ['calendar-routine-items'] as const
const OVERRIDE_KEY = ['calendar-routine-override'] as const

function logsKey(dateKey: string): QueryKey {
  return ['calendar-routine-logs', dateKey]
}

function overrideKey(dateKey: string): QueryKey {
  return [...OVERRIDE_KEY, dateKey]
}

function shouldInvalidateAfterMutation(data: unknown, error: unknown): boolean {
  if (!isOnline()) return false
  if (isOutboxQueuedError(error) || isOutboxQueuedResult(data)) return false
  return true
}

/** Named, switchable routine packs (e.g. "Weekdays", "Weekend", "Holiday"). */
export function useCalendarRoutines() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...PACKS_KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<CalendarRoutine[]> => {
      const { data, error } = await supabase
        .from('calendar_routines')
        .select('*')
        .eq('archived', false)
        .order('position', { ascending: true })
      if (error) throw error
      return data as CalendarRoutine[]
    },
  })
}

export function useCreateCalendarRoutine() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...PACKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: CalendarRoutineInput) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<CalendarRoutine[]>(key) ?? []
      const maxPosition = existing.reduce((max, r) => Math.max(max, r.position), 0)
      const position = maxPosition + 1
      const clientId = crypto.randomUUID()
      const now = new Date().toISOString()
      const offline: CalendarRoutine = {
        id: clientId,
        user_id: user.id,
        name: input.name,
        emoji: input.emoji,
        position,
        auto_apply_days: input.auto_apply_days ?? null,
        archived: false,
        created_at: now,
        updated_at: now,
      }

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_pack_create', input, clientId, position },
        offlineResult: offline,
        run: async () => {
          const { data, error } = await supabase
            .from('calendar_routines')
            .insert({ ...input, id: clientId, user_id: user.id, position })
            .select()
            .single()
          if (error) throw error
          return data as CalendarRoutine
        },
      })
    },
    onSuccess: (pack) => {
      queryClient.setQueryData<CalendarRoutine[]>(key, (old) => {
        if (!old) return [pack]
        if (old.some((r) => r.id === pack.id)) {
          return old.map((r) => (r.id === pack.id ? pack : r))
        }
        return [...old, pack]
      })
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useUpdateCalendarRoutine() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...PACKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, input }: { id: string; input: Partial<CalendarRoutineInput> }) => {
      if (!user) throw new Error('Not signed in')
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_pack_update', id, input },
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase.from('calendar_routines').update(input).eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CalendarRoutine[]>(key)
      queryClient.setQueryData<CalendarRoutine[]>(key, (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...input, updated_at: new Date().toISOString() } : r)),
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useArchiveCalendarRoutine() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...PACKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not signed in')
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_pack_archive', id },
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase.from('calendar_routines').update({ archived: true }).eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CalendarRoutine[]>(key)
      queryClient.setQueryData<CalendarRoutine[]>(key, (old) => old?.filter((r) => r.id !== id))
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/**
 * Sets `routineId`'s day-of-week auto-apply schedule, first stripping any of
 * those same days from every other active pack (at most one pack ever owns a
 * given weekday, mirroring the old "one weekday default, one weekend default"
 * exclusivity, generalized to arbitrary day sets).
 */
export function useSetCalendarRoutineSchedule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...PACKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ routineId, days }: { routineId: string; days: number[] }) => {
      if (!user) throw new Error('Not signed in')
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_schedule_set', routineId, days },
        offlineResult: undefined as void,
        run: () => setCalendarRoutineSchedule(routineId, days),
      })
    },
    onMutate: async ({ routineId, days }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CalendarRoutine[]>(key)
      const daySet = new Set(days)
      queryClient.setQueryData<CalendarRoutine[]>(key, (old) =>
        old?.map((r) => {
          if (r.id === routineId) return { ...r, auto_apply_days: days.length ? days : null }
          if (!r.auto_apply_days?.length) return r
          const remaining = r.auto_apply_days.filter((d) => !daySet.has(d))
          if (remaining.length === r.auto_apply_days.length) return r
          return { ...r, auto_apply_days: remaining.length ? remaining : null }
        }),
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Routine items across every pack — filter client-side by the pack active for a given day. */
export function useCalendarRoutineItems() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...ITEMS_KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<CalendarRoutineItem[]> => {
      const { data, error } = await supabase
        .from('calendar_routine_items')
        .select('*')
        .eq('archived', false)
        .order('position', { ascending: true })
      if (error) throw error
      return data as CalendarRoutineItem[]
    },
  })
}

export function useCreateCalendarRoutineItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...ITEMS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: CalendarRoutineItemInput) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<CalendarRoutineItem[]>(key) ?? []
      const maxPosition = existing.reduce((max, i) => Math.max(max, i.position), 0)
      const position = maxPosition + 1
      const clientId = crypto.randomUUID()
      const now = new Date().toISOString()
      const offline: CalendarRoutineItem = {
        id: clientId,
        user_id: user.id,
        routine_id: input.routine_id,
        title: input.title,
        emoji: input.emoji,
        block: input.block,
        estimated_minutes: input.estimated_minutes ?? null,
        position,
        archived: false,
        created_at: now,
        updated_at: now,
      }

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_create', input, clientId, position },
        offlineResult: offline,
        run: async () => {
          const { data, error } = await supabase
            .from('calendar_routine_items')
            .insert({ ...input, id: clientId, user_id: user.id, position })
            .select()
            .single()
          if (error) throw error
          return data as CalendarRoutineItem
        },
      })
    },
    onSuccess: (item) => {
      queryClient.setQueryData<CalendarRoutineItem[]>(key, (old) => {
        if (!old) return [item]
        if (old.some((i) => i.id === item.id)) {
          return old.map((i) => (i.id === item.id ? item : i))
        }
        return [...old, item]
      })
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useUpdateCalendarRoutineItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...ITEMS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, input }: { id: string; input: Partial<CalendarRoutineItemInput> }) => {
      if (!user) throw new Error('Not signed in')
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_item_update', id, input },
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase.from('calendar_routine_items').update(input).eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CalendarRoutineItem[]>(key)
      queryClient.setQueryData<CalendarRoutineItem[]>(key, (old) =>
        old?.map((i) => (i.id === id ? { ...i, ...input, updated_at: new Date().toISOString() } : i)),
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useArchiveCalendarRoutineItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...ITEMS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not signed in')
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_item_archive', id },
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase
            .from('calendar_routine_items')
            .update({ archived: true })
            .eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CalendarRoutineItem[]>(key)
      queryClient.setQueryData<CalendarRoutineItem[]>(key, (old) => old?.filter((i) => i.id !== id))
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Per-day completion logs for a CalendarRoutineItem set — used to render checkmarks for one day. */
export function useCalendarRoutineLogs(dateKey: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...logsKey(dateKey), user?.id],
    enabled: Boolean(user) && Boolean(dateKey),
    queryFn: async (): Promise<CalendarRoutineLog[]> => {
      const { data, error } = await supabase
        .from('calendar_routine_logs')
        .select('*')
        .eq('entry_date', dateKey)
      if (error) throw error
      return data as CalendarRoutineLog[]
    },
  })
}

export function useToggleCalendarRoutineLog(dateKey: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...logsKey(dateKey), user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      if (!user) throw new Error('Not signed in')
      const clientId = completed ? crypto.randomUUID() : undefined

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_toggle', itemId, dateKey, completed, clientId },
        offlineResult: undefined as void,
        run: async () => {
          if (completed) {
            const row: Record<string, unknown> = {
              item_id: itemId,
              user_id: user.id,
              entry_date: dateKey,
              completed: true,
            }
            const { error } = await supabase
              .from('calendar_routine_logs')
              .upsert(row, { onConflict: 'item_id,entry_date' })
            if (error) throw error
          } else {
            const { error } = await supabase
              .from('calendar_routine_logs')
              .delete()
              .eq('item_id', itemId)
              .eq('entry_date', dateKey)
            if (error) throw error
          }
        },
      })
    },
    onMutate: async ({ itemId, completed }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CalendarRoutineLog[]>(key)
      queryClient.setQueryData<CalendarRoutineLog[]>(key, (old) => {
        const rest = (old ?? []).filter((l) => l.item_id !== itemId)
        if (!completed) return rest
        const now = new Date().toISOString()
        return [
          ...rest,
          {
            id: `optimistic-${itemId}-${dateKey}`,
            item_id: itemId,
            user_id: user?.id ?? '',
            entry_date: dateKey,
            completed: true,
            created_at: now,
            updated_at: now,
          },
        ]
      })
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** The override (if any) covering a given date — a date range that takes priority over the day-of-week schedule. */
export function useCalendarRoutineOverride(dateKey: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...overrideKey(dateKey), user?.id],
    enabled: Boolean(user) && Boolean(dateKey),
    queryFn: async (): Promise<CalendarRoutineOverride | null> => {
      const { data, error } = await supabase
        .from('calendar_routine_overrides')
        .select('*')
        .lte('start_date', dateKey)
        .or(`end_date.is.null,end_date.gte.${dateKey}`)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as CalendarRoutineOverride | null) ?? null
    },
  })
}

/**
 * Pins `routineId` to `[startDate, endDate]` (`endDate: null` = indefinite),
 * deleting any existing overrides that overlap the new range first so at most
 * one override ever covers a given date. Optimistically updates cached dates in
 * the new range and clears cached dates whose pin overlaps this write (so
 * shrinking a range does not leave other days showing the old pack offline).
 */
export function useSetCalendarRoutineOverrideRange() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({
      routineId,
      startDate,
      endDate,
    }: {
      routineId: string | null
      startDate: string
      endDate: string | null
    }) => {
      if (!user) throw new Error('Not signed in')
      const clientId = crypto.randomUUID()
      const now = new Date().toISOString()
      const offline: CalendarRoutineOverride = {
        id: clientId,
        user_id: user.id,
        start_date: startDate,
        end_date: endDate,
        routine_id: routineId,
        created_at: now,
        updated_at: now,
      }

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_override_set', routineId, startDate, endDate, clientId },
        offlineResult: offline,
        run: async () => {
          await deleteOverlappingCalendarRoutineOverrides(user.id, startDate, endDate)
          const { data, error } = await supabase
            .from('calendar_routine_overrides')
            .insert({
              id: clientId,
              user_id: user.id,
              start_date: startDate,
              end_date: endDate,
              routine_id: routineId,
            })
            .select()
            .single()
          if (error) throw error
          return data as CalendarRoutineOverride
        },
      })
    },
    onMutate: async ({ routineId, startDate, endDate }) => {
      await queryClient.cancelQueries({ queryKey: OVERRIDE_KEY })
      const previousEntries = queryClient.getQueriesData<CalendarRoutineOverride | null>({
        queryKey: OVERRIDE_KEY,
      })
      const now = new Date().toISOString()
      const incoming = { start_date: startDate, end_date: endDate }
      for (const [queryKey, previous] of previousEntries) {
        const dateKey = queryKey[1] as string | undefined
        if (!dateKey) continue
        if (overrideCoversDate(incoming, dateKey)) {
          queryClient.setQueryData<CalendarRoutineOverride>(queryKey, {
            id: previous?.id ?? `optimistic-${dateKey}`,
            user_id: user?.id ?? '',
            start_date: startDate,
            end_date: endDate,
            routine_id: routineId,
            created_at: previous?.created_at ?? now,
            updated_at: now,
          })
        } else if (previous && overrideRangesOverlap(incoming, previous)) {
          queryClient.setQueryData<CalendarRoutineOverride | null>(queryKey, null)
        }
      }
      return { previousEntries }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previousEntries) {
        for (const [queryKey, previous] of context.previousEntries) {
          queryClient.setQueryData(queryKey, previous)
        }
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: OVERRIDE_KEY })
    },
  })
}

/** Clears whichever override currently covers `dateKey` (the "Reset to default" action). */
export function useClearCalendarRoutineOverrideForDate(dateKey: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...overrideKey(dateKey), user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in')
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'calendar_routine_override_clear', dateKey },
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase
            .from('calendar_routine_overrides')
            .delete()
            .eq('user_id', user.id)
            .lte('start_date', dateKey)
            .or(`end_date.is.null,end_date.gte.${dateKey}`)
          if (error) throw error
        },
      })
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: OVERRIDE_KEY })
      const previousEntries = queryClient.getQueriesData<CalendarRoutineOverride | null>({
        queryKey: OVERRIDE_KEY,
      })
      const covering = queryClient.getQueryData<CalendarRoutineOverride | null>(key)
      for (const [queryKey, previous] of previousEntries) {
        const cachedDate = queryKey[1] as string | undefined
        if (!cachedDate) continue
        const sameDay = cachedDate === dateKey
        const sameRange = Boolean(covering && previous && overrideCoversDate(covering, cachedDate))
        if (sameDay || sameRange) {
          queryClient.setQueryData<CalendarRoutineOverride | null>(queryKey, null)
        }
      }
      return { previousEntries }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previousEntries) {
        for (const [queryKey, previous] of context.previousEntries) {
          queryClient.setQueryData(queryKey, previous)
        }
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: OVERRIDE_KEY })
    },
  })
}
