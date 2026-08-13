import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useToggleTodo } from '@/hooks/useTodos'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { minutesFromSeconds, totalSeconds, type DaySeconds } from '@/lib/todoTimerLogic'
import type { Todo } from '@/lib/types'

export interface TodoTimePrompt {
  todoId: string
  workspaceId: string | null
  title: string
  days: DaySeconds[]
}

interface TodoTimePromptContextValue {
  prompt: TodoTimePrompt | null
  openSummary: (prompt: TodoTimePrompt) => void
  close: () => void
}

const TodoTimePromptContext = createContext<TodoTimePromptContextValue | null>(null)

export function TodoTimePromptProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<TodoTimePrompt | null>(null)

  const openSummary = useCallback((next: TodoTimePrompt) => setPrompt(next), [])
  const close = useCallback(() => setPrompt(null), [])

  const value = useMemo(() => ({ prompt, openSummary, close }), [close, openSummary, prompt])

  return <TodoTimePromptContext.Provider value={value}>{children}</TodoTimePromptContext.Provider>
}

export function useTodoTimePrompt() {
  const ctx = useContext(TodoTimePromptContext)
  if (!ctx) throw new Error('useTodoTimePrompt must be used within a TodoTimePromptProvider')
  return ctx
}

/** Marks a todo done/undone and opens a time summary only when tracked time exists. */
export function useCompleteTodoWithTime() {
  const toggleTodo = useToggleTodo()
  const { timerFor, storedSecondsFor, flush, clearTimer } = useTodoTimer()
  const { openSummary } = useTodoTimePrompt()

  return useCallback(
    async (todo: Todo, done: boolean) => {
      toggleTodo.mutate({ id: todo.id, done })
      if (!done) return

      const timer = timerFor(todo.id)
      const stored = storedSecondsFor(todo.id)
      if (!timer && stored === 0) return

      const days = await flush(todo.id)
      if (minutesFromSeconds(totalSeconds(days)) < 1) {
        await clearTimer(todo.id)
        return
      }

      openSummary({
        todoId: todo.id,
        workspaceId: todo.workspace_id,
        title: todo.title,
        days,
      })
    },
    [clearTimer, flush, openSummary, storedSecondsFor, timerFor, toggleTodo],
  )
}
