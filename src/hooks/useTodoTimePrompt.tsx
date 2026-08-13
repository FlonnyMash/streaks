import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useToggleTodo } from '@/hooks/useTodos'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { minutesFromSeconds, totalSeconds, type DaySeconds } from '@/lib/todoTimerLogic'
import { toDateKey } from '@/lib/utils'
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
  const { elapsedMsFor, previewDaysFor, flush } = useTodoTimer()
  const { openSummary } = useTodoTimePrompt()

  return useCallback(
    (todo: Todo, done: boolean) => {
      if (!done) {
        toggleTodo.mutate({ id: todo.id, done: false, tracked_minutes: null })
        return
      }

      const elapsed = elapsedMsFor(todo.id)
      let days = previewDaysFor(todo.id)
      if (totalSeconds(days) === 0 && elapsed > 0) {
        days = [{ dateKey: toDateKey(new Date()), seconds: Math.max(1, Math.round(elapsed / 1000) || 1) }]
      }
      const trackedMinutes = minutesFromSeconds(totalSeconds(days))
      const hasTime = elapsed > 0 || totalSeconds(days) > 0

      if (hasTime) {
        openSummary({
          todoId: todo.id,
          workspaceId: todo.workspace_id,
          title: todo.title,
          days,
        })
        void flush(todo.id)
        toggleTodo.mutate({ id: todo.id, done: true, tracked_minutes: trackedMinutes })
        return
      }

      toggleTodo.mutate({ id: todo.id, done: true, tracked_minutes: null })
    },
    [elapsedMsFor, flush, openSummary, previewDaysFor, toggleTodo],
  )
}
