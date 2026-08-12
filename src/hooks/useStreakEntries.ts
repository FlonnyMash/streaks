import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Mood, StreakEntry } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

function entriesKey(streakId: string) {
  return ['streak-entries', streakId] as const
}

const ALL_ENTRIES_KEY = { queryKey: ['streak-entries', 'all'], exact: false } as const

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
    // Sort only the streak IDs (order-independent cache key) — keep the 'streak-entries', 'all'
    // prefix intact so ALL_ENTRIES_KEY's partial-match filter below can find this query.
    queryKey: ['streak-entries', 'all', ...[...streakIds].sort()],
    enabled: streakIds.length > 0,
    queryFn: async (): Promise<StreakEntry[]> => {
      const { data, error } = await supabase.from('streak_entries').select('*').in('streak_id', streakIds)
      if (error) throw error
      return data as StreakEntry[]
    },
  })
}

function patchToggle(
  entries: StreakEntry[],
  streakId: string,
  dateKey: string,
  completed: boolean,
  userId: string,
): StreakEntry[] {
  if (completed) {
    const optimisticEntry: StreakEntry = {
      id: `optimistic-${streakId}-${dateKey}`,
      streak_id: streakId,
      user_id: userId,
      entry_date: dateKey,
      completed: true,
      note: null,
      mood: null,
      created_at: new Date().toISOString(),
    }
    const existingIdx = entries.findIndex((e) => e.streak_id === streakId && e.entry_date === dateKey)
    if (existingIdx >= 0) {
      const next = [...entries]
      next[existingIdx] = optimisticEntry
      return next
    }
    return [...entries, optimisticEntry]
  }
  return entries.filter((e) => !(e.streak_id === streakId && e.entry_date === dateKey))
}

interface ToggleContext {
  previousDetail: StreakEntry[] | undefined
  previousAll: Array<[QueryKey, StreakEntry[] | undefined]>
}

export function useToggleStreakEntry(streakId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dateKey, completed }: { dateKey: string; completed: boolean }) => {
      if (!user) throw new Error('Not signed in')
      if (completed) {
        const { error } = await supabase
          .from('streak_entries')
          .upsert(
            { streak_id: streakId, user_id: user.id, entry_date: dateKey, completed: true },
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
    onMutate: async ({ dateKey, completed }): Promise<ToggleContext | undefined> => {
      if (!user) return undefined
      await queryClient.cancelQueries({ queryKey: entriesKey(streakId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<StreakEntry[]>(entriesKey(streakId))
      const previousAll = queryClient.getQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY)

      queryClient.setQueryData<StreakEntry[]>(entriesKey(streakId), (old) =>
        patchToggle(old ?? [], streakId, dateKey, completed, user.id),
      )
      queryClient.setQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY, (old) =>
        old ? patchToggle(old, streakId, dateKey, completed, user.id) : old,
      )

      return { previousDetail, previousAll }
    },
    onError: (_err, _vars, context) => {
      if (!context) return
      queryClient.setQueryData(entriesKey(streakId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
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
  return entries.map((e) => (e.streak_id === streakId && e.entry_date === dateKey ? { ...e, note, mood } : e))
}

interface DetailsContext {
  previousDetail: StreakEntry[] | undefined
  previousAll: Array<[QueryKey, StreakEntry[] | undefined]>
}

export function useUpdateEntryDetails(streakId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dateKey, note, mood }: { dateKey: string; note: string | null; mood: Mood | null }) => {
      const { error } = await supabase
        .from('streak_entries')
        .update({ note, mood })
        .eq('streak_id', streakId)
        .eq('entry_date', dateKey)
      if (error) throw error
    },
    onMutate: async ({ dateKey, note, mood }): Promise<DetailsContext> => {
      await queryClient.cancelQueries({ queryKey: entriesKey(streakId) })
      await queryClient.cancelQueries(ALL_ENTRIES_KEY)

      const previousDetail = queryClient.getQueryData<StreakEntry[]>(entriesKey(streakId))
      const previousAll = queryClient.getQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY)

      queryClient.setQueryData<StreakEntry[]>(entriesKey(streakId), (old) =>
        old ? patchDetails(old, streakId, dateKey, note, mood) : old,
      )
      queryClient.setQueriesData<StreakEntry[]>(ALL_ENTRIES_KEY, (old) =>
        old ? patchDetails(old, streakId, dateKey, note, mood) : old,
      )

      return { previousDetail, previousAll }
    },
    onError: (_err, _vars, context) => {
      if (!context) return
      queryClient.setQueryData(entriesKey(streakId), context.previousDetail)
      for (const [key, data] of context.previousAll) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entriesKey(streakId) })
      queryClient.invalidateQueries(ALL_ENTRIES_KEY)
    },
  })
}
