import { useCallback } from 'react'
import { useToggleTodo } from '@/hooks/useTodos'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { minutesFromSeconds, totalSeconds } from '@/lib/todoTimerLogic'
import { toDateKey } from '@/lib/utils'
import type { Todo } from '@/lib/types'

/** Marks a todo done/undone, capturing minutes tracked by the todo timer when completing. */
export function useCompleteTodoWithTime() {
  const toggleTodo = useToggleTodo()
  const { elapsedMsFor, previewDaysFor, flush } = useTodoTimer()

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
        void flush(todo.id)
        toggleTodo.mutate({ id: todo.id, done: true, tracked_minutes: trackedMinutes })
        return
      }

      toggleTodo.mutate({ id: todo.id, done: true, tracked_minutes: null })
    },
    [elapsedMsFor, flush, previewDaysFor, toggleTodo],
  )
}
