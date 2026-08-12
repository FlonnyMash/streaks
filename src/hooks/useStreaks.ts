import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Streak, StreakInput } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

const STREAKS_KEY = ['streaks'] as const

export function useStreaks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...STREAKS_KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Streak[]> => {
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Streak[]
    },
  })
}

export function useCreateStreak() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: StreakInput) => {
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('streaks')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Streak
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STREAKS_KEY, user?.id] })
    },
  })
}

export function useUpdateStreak() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<StreakInput> }) => {
      const { data, error } = await supabase.from('streaks').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as Streak
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STREAKS_KEY, user?.id] })
    },
  })
}

export function useDeleteStreak() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('streaks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STREAKS_KEY, user?.id] })
    },
  })
}

export function useArchiveStreak() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('streaks').update({ archived: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STREAKS_KEY, user?.id] })
    },
  })
}
