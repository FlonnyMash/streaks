import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Todo, TodoInput, TodoTopic } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { normalizeTopicName } from '@/lib/todoLogic'

const TODOS_KEY = ['todos'] as const
const TODO_TOPICS_KEY = ['todo_topics'] as const

const TODO_SELECT = '*, todo_topic_links(todo_topics(*))'

interface TodoTopicLinkRow {
  todo_topics: TodoTopic | TodoTopic[] | null
}

type TodoRow = Omit<Todo, 'topics'> & {
  todo_topic_links?: TodoTopicLinkRow[] | null
}

function mapTodo(row: TodoRow): Todo {
  const topics = (row.todo_topic_links ?? [])
    .flatMap((link) => {
      const nested = link.todo_topics
      if (!nested) return []
      return Array.isArray(nested) ? nested : [nested]
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    notes: row.notes,
    done: row.done,
    due_date: row.due_date,
    importance: row.importance,
    position: row.position,
    archived: row.archived,
    completed_at: row.completed_at,
    created_at: row.created_at,
    topics,
  }
}

async function fetchUserTopics(userId: string): Promise<TodoTopic[]> {
  const { data, error } = await supabase.from('todo_topics').select('*').eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as TodoTopic[]
}

async function resolveTopicIds(userId: string, topicNames: string[]): Promise<string[]> {
  const names = [...new Set(topicNames.map(normalizeTopicName).filter(Boolean))]
  if (names.length === 0) return []

  const existing = await fetchUserTopics(userId)
  const byLower = new Map(existing.map((t) => [t.name.toLowerCase(), t]))
  const ids: string[] = []

  for (const name of names) {
    const found = byLower.get(name.toLowerCase())
    if (found) {
      ids.push(found.id)
      continue
    }

    const { data, error } = await supabase
      .from('todo_topics')
      .insert({ user_id: userId, name })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const retry = await fetchUserTopics(userId)
        const match = retry.find((t) => t.name.toLowerCase() === name.toLowerCase())
        if (!match) throw error
        byLower.set(match.name.toLowerCase(), match)
        ids.push(match.id)
        continue
      }
      throw error
    }

    const created = data as TodoTopic
    byLower.set(created.name.toLowerCase(), created)
    ids.push(created.id)
  }

  return ids
}

async function syncTodoTopics(userId: string, todoId: string, topicNames: string[]): Promise<void> {
  const topicIds = await resolveTopicIds(userId, topicNames)

  const { error: deleteError } = await supabase.from('todo_topic_links').delete().eq('todo_id', todoId)
  if (deleteError) throw deleteError

  if (topicIds.length === 0) return

  const { error: insertError } = await supabase
    .from('todo_topic_links')
    .insert(topicIds.map((topic_id) => ({ todo_id: todoId, topic_id })))
  if (insertError) throw insertError
}

export function useTodos() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...TODOS_KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Todo[]> => {
      const { data, error } = await supabase
        .from('todos')
        .select(TODO_SELECT)
        .eq('archived', false)
        .order('position', { ascending: true })
      if (error) throw error
      return ((data ?? []) as TodoRow[]).map(mapTodo)
    },
  })
}

export function useTodoTopics() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...TODO_TOPICS_KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<TodoTopic[]> => {
      const { data, error } = await supabase
        .from('todo_topics')
        .select('*')
        .eq('user_id', user!.id)
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as TodoTopic[]
    },
  })
}

export function useCreateTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TodoInput) => {
      if (!user) throw new Error('Not signed in')
      const { topicNames, ...fields } = input
      const existing = queryClient.getQueryData<Todo[]>([...TODOS_KEY, user.id]) ?? []
      const maxPosition = existing.reduce((max, t) => Math.max(max, t.position), 0)
      const { data, error } = await supabase
        .from('todos')
        .insert({ ...fields, user_id: user.id, position: maxPosition + 1 })
        .select()
        .single()
      if (error) throw error
      const todo = data as Omit<Todo, 'topics'>
      await syncTodoTopics(user.id, todo.id, topicNames ?? [])
      return todo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_KEY, user?.id] })
      queryClient.invalidateQueries({ queryKey: [...TODO_TOPICS_KEY, user?.id] })
    },
  })
}

export function useUpdateTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TodoInput> }) => {
      if (!user) throw new Error('Not signed in')
      const { topicNames, ...fields } = input
      if (Object.keys(fields).length > 0) {
        const { error } = await supabase.from('todos').update(fields).eq('id', id)
        if (error) throw error
      }
      if (topicNames !== undefined) {
        await syncTodoTopics(user.id, id, topicNames)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TODOS_KEY, user?.id] })
      queryClient.invalidateQueries({ queryKey: [...TODO_TOPICS_KEY, user?.id] })
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
