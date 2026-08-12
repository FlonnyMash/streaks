import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { StreakEntry } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

function entriesKey(streakId: string) {
  return ['streak-entries', streakId] as const
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
    queryKey: ['streak-entries', 'all', ...streakIds].sort(),
    enabled: streakIds.length > 0,
    queryFn: async (): Promise<StreakEntry[]> => {
      const { data, error } = await supabase.from('streak_entries').select('*').in('streak_id', streakIds)
      if (error) throw error
      return data as StreakEntry[]
    },
  })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesKey(streakId) })
      queryClient.invalidateQueries({ queryKey: ['streak-entries', 'all'], exact: false })
    },
  })
}
