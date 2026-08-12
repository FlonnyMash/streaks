import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, NotebookPen, Trash2 } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import type { Todo } from '@/lib/types'
import { cn, fromDateKey } from '@/lib/utils'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, done: boolean) => void
  onOpen: (todo: Todo) => void
  onDelete: (id: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}

function dueLabel(dueDate: string): { text: string; overdue: boolean } {
  const date = fromDateKey(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = date < today
  if (isToday(date)) return { text: 'Today', overdue: false }
  if (isTomorrow(date)) return { text: 'Tomorrow', overdue: false }
  return { text: format(date, 'MMM d'), overdue }
}

export function TodoItem({ todo, onToggle, onOpen, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: TodoItemProps) {
  const due = todo.due_date ? dueLabel(todo.due_date) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <button
        type="button"
        onClick={() => onToggle(todo.id, !todo.done)}
        aria-label={todo.done ? 'Mark as not done' : 'Mark as done'}
        className={cn(
          'shrink-0 size-6 rounded-full flex items-center justify-center transition-all active:scale-90 border-2',
          todo.done
            ? 'bg-accent-blue border-accent-blue text-white'
            : 'border-black/20 dark:border-white/25 hover:border-accent-blue',
        )}
      >
        <AnimatePresence>
          {todo.done && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="size-3.5" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <button type="button" onClick={() => onOpen(todo)} className="flex-1 min-w-0 text-left">
        <p
          className={cn(
            'text-[15px] font-medium truncate transition-colors',
            todo.done && 'line-through text-black/35 dark:text-white/35',
          )}
        >
          {todo.title}
        </p>
        {(due || todo.notes) && (
          <div className="flex items-center gap-2 mt-0.5">
            {due && (
              <span
                className={cn(
                  'text-[11px] font-medium',
                  todo.done
                    ? 'text-black/30 dark:text-white/30'
                    : due.overdue
                      ? 'text-accent-red'
                      : 'text-black/45 dark:text-white/45',
                )}
              >
                {due.text}
              </span>
            )}
            {todo.notes && <NotebookPen className="size-3 text-black/30 dark:text-white/30 shrink-0" />}
          </div>
        )}
      </button>

      {(onMoveUp || onMoveDown) && (
        <div className="hidden sm:flex flex-col shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
            className="size-5 flex items-center justify-center text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
            className="size-5 flex items-center justify-center text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        aria-label="Delete todo"
        className="shrink-0 size-8 rounded-full flex items-center justify-center text-black/30 dark:text-white/30 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
      >
        <Trash2 className="size-4" />
      </button>
    </motion.div>
  )
}
