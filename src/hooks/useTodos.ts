import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Todo, TodoInput } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

const TODOS_KEY = ['todos'] as const

export function useTodos() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...TODOS_KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Todo[]> => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('archived', false)
        .order('position', { ascending: true })
      if (error) throw error
      return data as Todo[]
    },
  })
}

export function useCreateTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TodoInput) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Todo[]>([...TODOS_KEY, user.id]) ?? []
      const maxPosition = existing.reduce((max, t) => Math.max(max, t.position), 0)
      const { data, error } = await supabase
        .from('todos')
        .insert({ ...input, user_id: user.id, position: maxPosition + 1 })
        .select()
        .single()
      if (error) throw error
      return data as Todo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_KEY, user?.id] })
    },
  })
}

export function useUpdateTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TodoInput> }) => {
      const { data, error } = await supabase.from('todos').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as Todo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_KEY, user?.id] })
    },
  })
}

export function useDeleteTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_KEY, user?.id] })
    },
  })
}

interface ToggleContext {
  previous: Todo[] | undefined
}

export function useToggleTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...TODOS_KEY, user?.id]

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('todos')
        .update({ done, completed_at: done ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, done }): Promise<ToggleContext> => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Todo[]>(key)
      queryClient.setQueryData<Todo[]>(key, (old) =>
        old?.map((t) => (t.id === id ? { ...t, done, completed_at: done ? new Date().toISOString() : null } : t)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Swaps the manual sort position of two todos (used for the up/down reorder controls). */
export function useSwapTodoPositions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...TODOS_KEY, user?.id]

  return useMutation({
    mutationFn: async ({ a, b }: { a: Todo; b: Todo }) => {
      const [{ error: errA }, { error: errB }] = await Promise.all([
        supabase.from('todos').update({ position: b.position }).eq('id', a.id),
        supabase.from('todos').update({ position: a.position }).eq('id', b.id),
      ])
      if (errA) throw errA
      if (errB) throw errB
    },
    onMutate: async ({ a, b }): Promise<ToggleContext> => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Todo[]>(key)
      queryClient.setQueryData<Todo[]>(key, (old) =>
        old?.map((t) => {
          if (t.id === a.id) return { ...t, position: b.position }
          if (t.id === b.id) return { ...t, position: a.position }
          return t
        }),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
