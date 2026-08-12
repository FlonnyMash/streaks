import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useToggleTodo } from '@/hooks/useTodos'
import { useTimesheetTimer } from '@/hooks/useTimesheetTimer'
import type { Todo } from '@/lib/types'

export type TodoTimePromptMode = 'save-timer' | 'log-estimate'

export interface TodoTimePrompt {
  mode: TodoTimePromptMode
  todoId: string
  workspaceId: string
  title: string
}

interface TodoTimePromptContextValue {
  prompt: TodoTimePrompt | null
  openSaveTimer: (todo: Todo) => void
  openLogEstimate: (todo: Todo) => void
  close: () => void
}

const TodoTimePromptContext = createContext<TodoTimePromptContextValue | null>(null)

function promptFromTodo(todo: Todo, mode: TodoTimePromptMode): TodoTimePrompt | null {
  if (!todo.workspace_id) return null
  return {
    mode,
    todoId: todo.id,
    workspaceId: todo.workspace_id,
    title: todo.title,
  }
}

export function TodoTimePromptProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<TodoTimePrompt | null>(null)

  const openSaveTimer = useCallback((todo: Todo) => {
    setPrompt(promptFromTodo(todo, 'save-timer'))
  }, [])

  const openLogEstimate = useCallback((todo: Todo) => {
    setPrompt(promptFromTodo(todo, 'log-estimate'))
  }, [])

  const close = useCallback(() => setPrompt(null), [])

  const value = useMemo(
    () => ({ prompt, openSaveTimer, openLogEstimate, close }),
    [close, openLogEstimate, openSaveTimer, prompt],
  )

  return <TodoTimePromptContext.Provider value={value}>{children}</TodoTimePromptContext.Provider>
}

export function useTodoTimePrompt() {
  const ctx = useContext(TodoTimePromptContext)
  if (!ctx) throw new Error('useTodoTimePrompt must be used within a TodoTimePromptProvider')
  return ctx
}

/** Marks a todo done/undone and opens the matching time-log prompt when completing. */
export function useCompleteTodoWithTime() {
  const toggleTodo = useToggleTodo()
  const { sessionForTodo, requestStop } = useTimesheetTimer()
  const { openSaveTimer, openLogEstimate } = useTodoTimePrompt()

  return useCallback(
    (todo: Todo, done: boolean) => {
      toggleTodo.mutate({ id: todo.id, done })
      if (!done) return

      const session = sessionForTodo(todo.id)
      if (session) {
        requestStop(session.id, { variant: 'todo-complete' })
        openSaveTimer(todo)
        return
      }
      if (todo.workspace_id) openLogEstimate(todo)
    },
    [openLogEstimate, openSaveTimer, requestStop, sessionForTodo, toggleTodo],
  )
}
