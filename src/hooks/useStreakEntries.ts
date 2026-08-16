import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Mood, StreakEntry } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { runOrEnqueue, isOutboxQueuedError, isOutboxQueuedResult } from '@/lib/offline/runOrEnqueue'
import { isOnline } from '@/lib/offline/network'
import { stashExpectedUpdatedAt, readExpectedUpdatedAt } from '@/lib/offline/expectedUpdatedAt'

function entriesKey(streakId: string) {
  return ['streak-entries', streakId] as const
}

const ALL_ENTRIES_KEY = { queryKey: ['streak-entries', 'all'], exact: false } as const

function shouldInvalidateAfterMutation(data: unknown, error: unknown): boolean {
  if (!isOnline()) return false
  if (isOutboxQueuedError(error) || isOutboxQueuedResult(data)) return false
  return true
}
export function useStreakEntries(streakId: string | undefined) {
  return useQuery({
    queryKey: entriesKey(streakId ?? ''),
    enabled: Boolean(streakId),
    queryFn: async (): Promise<StreakEntry[]> => {
      const { data, error } = await supabase
        .from('streak_entries')
        .select('*')
        .eq('streak_id', streakId as string)
      if (error) throw error
      return data as StreakEntry[]
    },
  })
}

/** Fetches entries for many streaks at once, used on the dashboard. */
export function useAllStreakEntries(streakIds: string[]) {
  return useQuery({
    queryKey: ['streak-entries', 'all', ...[...streakIds].sort()],
    enabled: streakIds.length > 0,
    queryFn: async (): Promise<StreakEntry[]> => {
      const { data, error } = await supabase.from('streak_entries').select('*').in('streak_id', streakIds)
      if (error) throw error
      return data as StreakEntry[]
    },
  })
}

function findEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  streakId: string,
  dateKey: string,
): StreakEntry | undefined {
  const detail = queryClient.getQueryData<StreakEntry[]>(entriesKey(streakId))
  const fromDetail = detail?.find((e) => e.streak_id === streakId && e.entry_date === dateKey)
  if (fromDetail) return fromDetail
  for (const [, data] of queryClient.getQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY)) {
    const hit = data?.find((e) => e.streak_id === streakId && e.entry_date === dateKey)
    if (hit) return hit
  }
  return undefined
}

function patchToggle(
  entries: StreakEntry[],
  streakId: string,
  dateKey: string,
  completed: boolean,
  userId: string,
  clientId: string,
): StreakEntry[] {
  if (completed) {
    const now = new Date().toISOString()
    const optimisticEntry: StreakEntry = {
      id: clientId,
      streak_id: streakId,
      user_id: userId,
      entry_date: dateKey,
      completed: true,
      note: null,
      mood: null,
      minutes: null,
      created_at: now,
      updated_at: now,
    }
    const existingIdx = entries.findIndex((e) => e.streak_id === streakId && e.entry_date === dateKey)
    if (existingIdx >= 0) {
      const next = [...entries]
      next[existingIdx] = { ...entries[existingIdx], ...optimisticEntry, id: entries[existingIdx].id }
      return next
    }
    return [...entries, optimisticEntry]
  }
  return entries.filter((e) => !(e.streak_id === streakId && e.entry_date === dateKey))
}

interface ToggleContext {
  previousDetail: StreakEntry[] | undefined
  previousAll: Array<[QueryKey, StreakEntry[] | undefined]>
  clientId: string
}

export function useToggleStreakEntry(streakId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({
      dateKey,
      completed,
      clientId,
    }: {
      dateKey: string
      completed: boolean
      clientId?: string
    }) => {
      if (!user) throw new Error('Not signed in')
      const existing = findEntry(queryClient, streakId, dateKey)
      const id = clientId ?? existing?.id ?? crypto.randomUUID()
      const expectedUpdatedAt = readExpectedUpdatedAt(`streak_entry:${streakId}:${dateKey}`)

      return runOrEnqueue({
        userId: user.id,
        payload: {
          kind: 'streak_entry_toggle',
          streakId,
          dateKey,
          completed,
          clientId: completed ? id : undefined,
        },
        expectedUpdatedAt,
        run: async () => {
          if (completed) {
            const { error } = await supabase.from('streak_entries').upsert(
              {
                id,
                streak_id: streakId,
                user_id: user.id,
                entry_date: dateKey,
                completed: true,
              },
              { onConflict: 'streak_id,entry_date' },
            )
            if (error) throw error
          } else {
            const { error } = await supabase
              .from('streak_entries')
              .delete()
              .eq('streak_id', streakId)
              .eq('entry_date', dateKey)
            if (error) throw error
          }
        },
      })
    },
    onMutate: async (vars): Promise<ToggleContext | undefined> => {
      if (!user) return undefined
      const { dateKey, completed } = vars
      await queryClient.cancelQueries({ queryKey: entriesKey(streakId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<StreakEntry[]>(entriesKey(streakId))
      const previousAll = queryClient.getQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY)
      const existing = findEntry(queryClient, streakId, dateKey)
      stashExpectedUpdatedAt(`streak_entry:${streakId}:${dateKey}`, existing?.updated_at)
      const clientId = vars.clientId ?? existing?.id ?? crypto.randomUUID()
      vars.clientId = clientId

      queryClient.setQueryData<StreakEntry[]>(entriesKey(streakId), (old) =>
        patchToggle(old ?? [], streakId, dateKey, completed, user.id, clientId),
      )
      queryClient.setQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY, (old) =>
        old ? patchToggle(old, streakId, dateKey, completed, user.id, clientId) : old,
      )

      return { previousDetail, previousAll, clientId }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (!context) return
      queryClient.setQueryData(entriesKey(streakId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: entriesKey(streakId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}

function patchMinutes(
  entries: StreakEntry[],
  streakId: string,
  dateKey: string,
  minutes: number,
  completed: boolean,
  userId: string,
  clientId: string,
): StreakEntry[] {
  const now = new Date().toISOString()
  const existingIdx = entries.findIndex((e) => e.streak_id === streakId && e.entry_date === dateKey)
  if (existingIdx >= 0) {
    const next = [...entries]
    next[existingIdx] = { ...next[existingIdx], minutes, completed, updated_at: now }
    return next
  }
  const optimisticEntry: StreakEntry = {
    id: clientId,
    streak_id: streakId,
    user_id: userId,
    entry_date: dateKey,
    completed,
    note: null,
    mood: null,
    minutes,
    created_at: now,
    updated_at: now,
  }
  return [...entries, optimisticEntry]
}

interface MinutesContext {
  previousDetail: StreakEntry[] | undefined
  previousAll: Array<[QueryKey, StreakEntry[] | undefined]>
  clientId: string
}

/**
 * Logs minutes for a day. `completed` must be computed by the caller:
 * - day time goals: `minutes >= time_goal_minutes`
 * - week/month time goals: always `false` (period totals drive the streak, not per-day flags)
 * - track_time without a goal: pass through the entry's existing `completed` so the checkbox stays primary
 */
export function useLogMinutes(streakId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({
      dateKey,
      minutes,
      completed,
      clientId,
    }: {
      dateKey: string
      minutes: number
      completed: boolean
      clientId?: string
    }) => {
      if (!user) throw new Error('Not signed in')
      const existing = findEntry(queryClient, streakId, dateKey)
      const id = clientId ?? existing?.id ?? crypto.randomUUID()
      const expectedUpdatedAt = readExpectedUpdatedAt(`streak_entry:${streakId}:${dateKey}`)

      return runOrEnqueue({
        userId: user.id,
        payload: {
          kind: 'streak_entry_minutes',
          streakId,
          dateKey,
          minutes,
          completed,
          clientId: id,
        },
        expectedUpdatedAt,
        run: async () => {
          const { error } = await supabase.from('streak_entries').upsert(
            {
              id,
              streak_id: streakId,
              user_id: user.id,
              entry_date: dateKey,
              minutes,
              completed,
            },
            { onConflict: 'streak_id,entry_date' },
          )
          if (error) throw error
        },
      })
    },
    onMutate: async (vars): Promise<MinutesContext | undefined> => {
      if (!user) return undefined
      const { dateKey, minutes, completed } = vars
      await queryClient.cancelQueries({ queryKey: entriesKey(streakId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<StreakEntry[]>(entriesKey(streakId))
      const previousAll = queryClient.getQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY)
      const existing = findEntry(queryClient, streakId, dateKey)
      stashExpectedUpdatedAt(`streak_entry:${streakId}:${dateKey}`, existing?.updated_at)
      const clientId = vars.clientId ?? existing?.id ?? crypto.randomUUID()
      vars.clientId = clientId

      queryClient.setQueryData<StreakEntry[]>(entriesKey(streakId), (old) =>
        patchMinutes(old ?? [], streakId, dateKey, minutes, completed, user.id, clientId),
      )
      queryClient.setQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY, (old) =>
        old ? patchMinutes(old, streakId, dateKey, minutes, completed, user.id, clientId) : old,
      )

      return { previousDetail, previousAll, clientId }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (!context) return
      queryClient.setQueryData(entriesKey(streakId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: entriesKey(streakId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}

function patchDetails(
  entries: StreakEntry[],
  streakId: string,
  dateKey: string,
  note: string | null,
  mood: Mood | null,
): StreakEntry[] {
  const now = new Date().toISOString()
  return entries.map((e) =>
    e.streak_id === streakId && e.entry_date === dateKey ? { ...e, note, mood, updated_at: now } : e,
  )
}

interface DetailsContext {
  previousDetail: StreakEntry[] | undefined
  previousAll: Array<[QueryKey, StreakEntry[] | undefined]>
}

export function useUpdateEntryDetails(streakId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ dateKey, note, mood }: { dateKey: string; note: string | null; mood: Mood | null }) => {
      if (!user) throw new Error('Not signed in')
      const expectedUpdatedAt = readExpectedUpdatedAt(`streak_entry:${streakId}:${dateKey}`)
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'streak_entry_details', streakId, dateKey, note, mood },
        expectedUpdatedAt,
        run: async () => {
          const { error } = await supabase
            .from('streak_entries')
            .update({ note, mood })
            .eq('streak_id', streakId)
            .eq('entry_date', dateKey)
          if (error) throw error
        },
      })
    },
    onMutate: async ({ dateKey, note, mood }): Promise<DetailsContext> => {
      await queryClient.cancelQueries({ queryKey: entriesKey(streakId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<StreakEntry[]>(entriesKey(streakId))
      const previousAll = queryClient.getQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY)
      const existing = findEntry(queryClient, streakId, dateKey)
      stashExpectedUpdatedAt(`streak_entry:${streakId}:${dateKey}`, existing?.updated_at)

      queryClient.setQueryData<StreakEntry[]>(entriesKey(streakId), (old) =>
        old ? patchDetails(old, streakId, dateKey, note, mood) : old,
      )
      queryClient.setQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY, (old) =>
        old ? patchDetails(old, streakId, dateKey, note, mood) : old,
      )

      return { previousDetail, previousAll }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (!context) return
      queryClient.setQueryData(entriesKey(streakId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (data, error) => {
      if (!shouldInvalidateAfterMutation(data, error)) return
      queryClient.invalidateQueries({ queryKey: entriesKey(streakId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}
