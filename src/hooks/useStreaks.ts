import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Streak, StreakInput } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { runOrEnqueue, isOutboxQueuedError } from '@/lib/offline/runOrEnqueue'
import { isOnline } from '@/lib/offline/network'

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
  const key = [...STREAKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: StreakInput) => {
      if (!user) throw new Error('Not signed in')
      const clientId = crypto.randomUUID()
      const now = new Date().toISOString()
      const offline: Streak = {
        id: clientId,
        user_id: user.id,
        ...input,
        archived: false,
        created_at: now,
        updated_at: now,
      }

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'streak_create', input, clientId },
        offlineResult: offline,
        run: async () => {
          const { data, error } = await supabase
            .from('streaks')
            .insert({ ...input, id: clientId, user_id: user.id })
            .select()
            .single()
          if (error) throw error
          return data as Streak
        },
      })
    },
    onSuccess: (streak) => {
      queryClient.setQueryData<Streak[]>(key, (old) => {
        if (!old) return [streak]
        if (old.some((s) => s.id === streak.id)) {
          return old.map((s) => (s.id === streak.id ? streak : s))
        }
        return [...old, streak]
      })
    },
    onSettled: () => {
      if (!isOnline()) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useUpdateStreak() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...STREAKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, input }: { id: string; input: Partial<StreakInput> }) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Streak[]>(key)?.find((s) => s.id === id)
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'streak_update', id, input },
        expectedUpdatedAt: existing?.updated_at ?? null,
        run: async () => {
          const { data, error } = await supabase.from('streaks').update(input).eq('id', id).select().single()
          if (error) throw error
          return data as Streak
        },
      })
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Streak[]>(key)
      queryClient.setQueryData<Streak[]>(key, (old) =>
        old?.map((s) =>
          s.id === id ? { ...s, ...input, updated_at: new Date().toISOString() } : s,
        ),
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      if (!isOnline()) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useDeleteStreak() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...STREAKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Streak[]>(key)?.find((s) => s.id === id)
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'streak_delete', id },
        expectedUpdatedAt: existing?.updated_at ?? null,
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase.from('streaks').delete().eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Streak[]>(key)
      queryClient.setQueryData<Streak[]>(key, (old) => old?.filter((s) => s.id !== id))
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      if (!isOnline()) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useArchiveStreak() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...STREAKS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Streak[]>(key)?.find((s) => s.id === id)
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'streak_archive', id },
        expectedUpdatedAt: existing?.updated_at ?? null,
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase.from('streaks').update({ archived: true }).eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Streak[]>(key)
      queryClient.setQueryData<Streak[]>(key, (old) => old?.filter((s) => s.id !== id))
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      if (!isOnline()) return
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
