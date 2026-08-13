import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Todo, TodoInput, TodoTopic } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { syncTodoTopics } from '@/lib/todoTopics'
import { runOrEnqueue, isOutboxQueuedError } from '@/lib/offline/runOrEnqueue'
import { isOnline } from '@/lib/offline/network'

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
    updated_at: row.updated_at ?? row.created_at,
    workspace_id: row.workspace_id ?? null,
    tracked_minutes: row.tracked_minutes ?? null,
    notify_enabled: Boolean(row.notify_enabled),
    topics,
  }
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
  const key = [...TODOS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: TodoInput) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Todo[]>(key) ?? []
      const maxPosition = existing.reduce((max, t) => Math.max(max, t.position), 0)
      const position = maxPosition + 1
      const clientId = crypto.randomUUID()
      const now = new Date().toISOString()
      const { topicNames, ...fields } = input

      const offlineTodo: Omit<Todo, 'topics'> & { topics: Todo['topics'] } = {
        id: clientId,
        user_id: user.id,
        title: fields.title,
        notes: fields.notes,
        done: false,
        due_date: fields.due_date,
        importance: fields.importance,
        position,
        archived: false,
        completed_at: null,
        created_at: now,
        updated_at: now,
        workspace_id: fields.workspace_id ?? null,
        tracked_minutes: null,
        notify_enabled: Boolean(fields.notify_enabled),
        topics: (topicNames ?? []).map((name) => ({
          id: `local-topic-${name}`,
          user_id: user.id,
          name,
          created_at: now,
        })),
      }

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'todo_create', input, clientId, position },
        offlineResult: offlineTodo,
        run: async () => {
          const { data, error } = await supabase
            .from('todos')
            .insert({ ...fields, id: clientId, user_id: user.id, position })
            .select()
            .single()
          if (error) throw error
          const todo = data as Omit<Todo, 'topics'>
          await syncTodoTopics(user.id, todo.id, topicNames ?? [])
          return { ...todo, topics: offlineTodo.topics }
        },
      })
    },
    onMutate: async () => {
      if (!user) return undefined
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Todo[]>(key)
      return { previous }
    },
    onSuccess: (todo) => {
      if (!user) return
      queryClient.setQueryData<Todo[]>(key, (old) => {
        if (!old) return [todo as Todo]
        if (old.some((t) => t.id === todo.id)) {
          return old.map((t) => (t.id === todo.id ? (todo as Todo) : t))
        }
        return [...old, todo as Todo]
      })
    },
    onError: (err, _vars, context) => {
      if (isOutboxQueuedError(err)) return
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      if (!isOnline()) return
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: [...TODO_TOPICS_KEY, user?.id] })
    },
  })
}

export function useUpdateTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...TODOS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ id, input }: { id: string; input: Partial<TodoInput> }) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Todo[]>(key)?.find((t) => t.id === id)
      const { topicNames, ...fields } = input

      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'todo_update', id, input },
        expectedUpdatedAt: existing?.updated_at ?? null,
        offlineResult: undefined as void,
        run: async () => {
          if (Object.keys(fields).length > 0) {
            const { error } = await supabase.from('todos').update(fields).eq('id', id)
            if (error) throw error
          }
          if (topicNames !== undefined) {
            await syncTodoTopics(user.id, id, topicNames)
          }
        },
      })
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Todo[]>(key)
      const { topicNames, ...fields } = input
      queryClient.setQueryData<Todo[]>(key, (old) =>
        old?.map((t) => {
          if (t.id !== id) return t
          return {
            ...t,
            ...fields,
            topics:
              topicNames !== undefined
                ? topicNames.map((name) => ({
                    id: `local-topic-${name}`,
                    user_id: t.user_id,
                    name,
                    created_at: t.created_at,
                  }))
                : t.topics,
            updated_at: new Date().toISOString(),
          }
        }),
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
      queryClient.invalidateQueries({ queryKey: [...TODO_TOPICS_KEY, user?.id] })
    },
  })
}

export function useDeleteTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...TODOS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Todo[]>(key)?.find((t) => t.id === id)
      return runOrEnqueue({
        userId: user.id,
        payload: { kind: 'todo_delete', id },
        expectedUpdatedAt: existing?.updated_at ?? null,
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase.from('todos').delete().eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Todo[]>(key)
      queryClient.setQueryData<Todo[]>(key, (old) => old?.filter((t) => t.id !== id))
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

interface ToggleContext {
  previous: Todo[] | undefined
}

export function useToggleTodo() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...TODOS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({
      id,
      done,
      tracked_minutes,
    }: {
      id: string
      done: boolean
      tracked_minutes?: number | null
    }) => {
      if (!user) throw new Error('Not signed in')
      const existing = queryClient.getQueryData<Todo[]>(key)?.find((t) => t.id === id)
      const completed_at = done ? new Date().toISOString() : null
      const payload: {
        done: boolean
        completed_at: string | null
        tracked_minutes?: number | null
      } = {
        done,
        completed_at,
      }
      if (tracked_minutes !== undefined) payload.tracked_minutes = tracked_minutes
      else if (!done) payload.tracked_minutes = null

      return runOrEnqueue({
        userId: user.id,
        payload: {
          kind: 'todo_toggle',
          id,
          done,
          tracked_minutes: payload.tracked_minutes,
          completed_at,
        },
        expectedUpdatedAt: existing?.updated_at ?? null,
        offlineResult: undefined as void,
        run: async () => {
          const { error } = await supabase.from('todos').update(payload).eq('id', id)
          if (error) throw error
        },
      })
    },
    onMutate: async ({ id, done, tracked_minutes }): Promise<ToggleContext> => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Todo[]>(key)
      queryClient.setQueryData<Todo[]>(key, (old) =>
        old?.map((t) => {
          if (t.id !== id) return t
          const nextMinutes =
            tracked_minutes !== undefined ? tracked_minutes : done ? t.tracked_minutes : null
          return {
            ...t,
            done,
            completed_at: done ? new Date().toISOString() : null,
            tracked_minutes: nextMinutes ?? null,
            updated_at: new Date().toISOString(),
          }
        }),
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

/** Swaps the manual sort position of two todos (used for the up/down reorder controls). */
export function useSwapTodoPositions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...TODOS_KEY, user?.id]

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ a, b }: { a: Todo; b: Todo }) => {
      if (!user) throw new Error('Not signed in')
      return runOrEnqueue({
        userId: user.id,
        payload: {
          kind: 'todo_swap',
          aId: a.id,
          bId: b.id,
          aPosition: a.position,
          bPosition: b.position,
        },
        expectedUpdatedAt: a.updated_at,
        offlineResult: undefined as void,
        run: async () => {
          const [{ error: errA }, { error: errB }] = await Promise.all([
            supabase.from('todos').update({ position: b.position }).eq('id', a.id),
            supabase.from('todos').update({ position: a.position }).eq('id', b.id),
          ])
          if (errA) throw errA
          if (errB) throw errB
        },
      })
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
