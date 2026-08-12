import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ListTodo, PartyPopper } from 'lucide-react'
import { useTodos } from '@/hooks/useTodos'
import { useCompleteTodoWithTime } from '@/hooks/useTodoTimePrompt'
import { toDateKey } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

const IMPORTANCE_DOT = { 1: 'bg-black/20 dark:bg-white/25', 2: 'bg-accent-orange', 3: 'bg-accent-red' } as const

export function TodosTodayWidget() {
  const { data: todos, isLoading } = useTodos()
  const completeTodo = useCompleteTodoWithTime()
  const todayKey = toDateKey(new Date())

  const dueToday = (todos ?? [])
    .filter((t) => t.due_date === todayKey)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.importance - a.importance)

  const doneCount = dueToday.filter((t) => t.done).length

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

      {!isLoading && dueToday.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
          <PartyPopper className="size-6 text-accent-green/70" />
          <p className="text-[13px] text-black/45 dark:text-white/45">Nothing due today. You're all caught up.</p>
        </div>
      )}

      {!isLoading && dueToday.length > 0 && (
        <div className="flex-1 flex flex-col gap-0.5">
          {dueToday.map((todo) => (
            <button
              key={todo.id}
              type="button"
              onClick={() => completeTodo(todo, !todo.done)}
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
