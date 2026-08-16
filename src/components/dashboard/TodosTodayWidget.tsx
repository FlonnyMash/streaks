import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ListTodo, Pause, PartyPopper } from 'lucide-react'
import { useTodos } from '@/hooks/useTodos'
import { useCompleteTodoWithTime } from '@/hooks/useCompleteTodoWithTime'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { formatElapsedClock } from '@/lib/todoTimerLogic'
import { toDateKey } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

const IMPORTANCE_DOT = { 1: 'bg-black/20 dark:bg-white/25', 2: 'bg-accent-orange', 3: 'bg-accent-red' } as const

export function TodosTodayWidget() {
  const { data: todos, isLoading } = useTodos()
  const completeTodo = useCompleteTodoWithTime()
  const { runningTimer, elapsedMsFor, pause, isSyncing } = useTodoTimer()
  const todayKey = toDateKey(new Date())

  const dueToday = (todos ?? [])
    .filter((t) => t.due_date === todayKey)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.importance - a.importance)

  const doneCount = dueToday.filter((t) => t.done).length
  const runningTodo = todos?.find((t) => t.id === runningTimer?.todoId) ?? null

  return (
    <div className="glass-panel rounded-[24px] p-5 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="size-4 text-accent-blue" />
          <h2 className="font-semibold text-[15px]">To-Dos Today</h2>
        </div>
        {dueToday.length > 0 && (
          <span className="text-[13px] font-medium text-black/45 dark:text-white/45 tabular-nums">
            {doneCount}/{dueToday.length}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex-1 min-h-0">
          <Spinner className="size-5" />
        </div>
      )}

      {!isLoading && runningTodo && runningTimer && (
        <div className="glass-inset rounded-2xl px-3.5 py-3 flex flex-col gap-2 mb-3 relative overflow-hidden pl-4">
          <span className="absolute inset-y-0 left-0 w-[3px] bg-accent-blue" />
          <div className="flex items-center gap-3">
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-blue opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-accent-blue" />
            </span>
            <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{runningTodo.title}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight">
              {formatElapsedClock(elapsedMsFor(runningTodo.id))}
            </span>
            <Button type="button" size="sm" onClick={() => void pause(runningTodo.id)} loading={isSyncing}>
              <Pause className="size-3.5 fill-current" />
              Pause
            </Button>
          </div>
        </div>
      )}

      {!isLoading && dueToday.length === 0 && !runningTodo && (
        <EmptyState
          icon={<PartyPopper className="size-6" />}
          iconClassName="text-accent-green"
          body="Nothing due today. You're all caught up."
        />
      )}

      {!isLoading && dueToday.length === 0 && runningTodo && (
        <p className="text-[13px] text-black/45 dark:text-white/45 mb-1">Nothing else due today.</p>
      )}

      {!isLoading && dueToday.length > 0 && (
        <div className="flex-1 flex flex-col gap-0.5">
          {dueToday.map((todo) => (
            <button
              key={todo.id}
              type="button"
              onClick={() => void completeTodo(todo, !todo.done)}
              className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 -mx-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors text-left"
            >
              {todo.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-accent-green" fill="currentColor" fillOpacity={0.2} />
              ) : (
                <Circle className="size-5 shrink-0 text-black/20 dark:text-white/20" />
              )}
              <span className={`flex-1 min-w-0 truncate text-[14px] font-medium ${todo.done ? 'line-through text-black/40 dark:text-white/40' : ''}`}>
                {todo.title}
              </span>
              {runningTimer?.todoId === todo.id && (
                <span className="text-[12px] font-semibold tabular-nums text-accent-blue shrink-0">
                  {formatElapsedClock(elapsedMsFor(todo.id))}
                </span>
              )}
              <span className={`size-1.5 rounded-full shrink-0 ${IMPORTANCE_DOT[todo.importance]}`} />
            </button>
          ))}
        </div>
      )}

      <Link
        to="/todos"
        className="mt-3 inline-flex text-[13px] font-medium text-accent-blue hover:brightness-110 transition-all"
      >
        View all to-dos →
      </Link>
    </div>
  )
}
