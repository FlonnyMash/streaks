import { AnimatePresence } from 'framer-motion'
import { TodoItem } from '@/components/todos/TodoItem'
import { ROUTINE_ACCENT, ROUTINE_ICONS, ROUTINE_LABELS, ROUTINE_ORDER, groupTodosByRoutine, totalEstimatedMinutes } from '@/lib/routineLogic'
import { formatMinutes } from '@/lib/utils'
import type { Todo } from '@/lib/types'

interface RoutineTimelineProps {
  todos: Todo[]
  onToggle: (id: string, done: boolean) => void
  onView: (todo: Todo) => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
}

/** Segmented Morning / Afternoon / Evening / Anytime view of a todo list, Tiimo-style. */
export function RoutineTimeline({ todos, onToggle, onView, onEdit, onDelete }: RoutineTimelineProps) {
  const grouped = groupTodosByRoutine(todos)
  const visibleBlocks = ROUTINE_ORDER.filter((block) => grouped[block].length > 0)

  if (visibleBlocks.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {visibleBlocks.map((block) => {
        const Icon = ROUTINE_ICONS[block]
        const accent = ROUTINE_ACCENT[block]
        const blockTodos = grouped[block]
        const minutes = totalEstimatedMinutes(blockTodos)
        return (
          <section key={block}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className={`size-6 rounded-full flex items-center justify-center ${accent.bg}`}>
                <Icon className={`size-3.5 ${accent.text}`} />
              </div>
              <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide">
                {ROUTINE_LABELS[block]} · {blockTodos.length}
              </h2>
              {minutes > 0 && (
                <span className="text-[12px] text-black/35 dark:text-white/35 ml-auto normal-case tracking-normal">
                  ~{formatMinutes(minutes)}
                </span>
              )}
            </div>
            <div className="glass-panel rounded-[24px] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
              <AnimatePresence initial={false}>
                {blockTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggle}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )
      })}
    </div>
  )
}
