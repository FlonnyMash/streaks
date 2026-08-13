import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { ImportanceMeter } from '@/components/todos/ImportanceMeter'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { formatElapsedClock } from '@/lib/timesheetLogic'
import { minutesFromSeconds } from '@/lib/todoTimerLogic'
import type { Todo } from '@/lib/types'
import { cn, formatMinutes, fromDateKey } from '@/lib/utils'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, done: boolean) => void
  onView: (todo: Todo) => void
  onEdit: (todo: Todo) => void
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

export function TodoItem({ todo, onToggle, onView, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: TodoItemProps) {
  const due = todo.due_date ? dueLabel(todo.due_date) : null
  const notesPreview = todo.notes?.trim() || null
  const { data: workspaces } = useTimesheetWorkspaces()
  const { requestStart, pause, elapsedMsFor, storedSecondsFor, timerFor } = useTodoTimer()

  const workspace = todo.workspace_id
    ? (workspaces ?? []).find((w) => w.id === todo.workspace_id) ?? null
    : null
  const timer = timerFor(todo.id)
  const running = Boolean(timer?.runningSince)
  const storedSeconds = storedSecondsFor(todo.id)
  const showTimer = Boolean(workspace && !todo.done)
  const elapsedMs = elapsedMsFor(todo.id)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-start gap-3 px-4 py-3"
    >
      <button
        type="button"
        onClick={() => onToggle(todo.id, !todo.done)}
        aria-label={todo.done ? 'Mark as not done' : 'Mark as done'}
        className={cn(
          'shrink-0 size-6 mt-0.5 rounded-full flex items-center justify-center transition-all active:scale-90 border-2',
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

      <button type="button" onClick={() => onView(todo)} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <ImportanceMeter value={todo.importance ?? 1} size="sm" className="shrink-0 opacity-90" />
          <p
            className={cn(
              'text-[15px] font-medium truncate transition-colors',
              todo.done && 'line-through text-black/35 dark:text-white/35',
            )}
          >
            {todo.title}
          </p>
        </div>
        {(due || notesPreview || (todo.topics ?? []).length > 0 || workspace || (todo.done && todo.tracked_minutes)) && (
          <div className="mt-0.5 min-w-0">
            {due && (
              <p
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
              </p>
            )}
            {notesPreview && (
              <p
                className={cn(
                  'text-[12px] line-clamp-2 break-words',
                  due && 'mt-0.5',
                  todo.done ? 'text-black/25 dark:text-white/25' : 'text-black/45 dark:text-white/45',
                )}
              >
                {notesPreview}
              </p>
            )}
            {(workspace || (todo.topics ?? []).length > 0) && (
              <div className={cn('flex flex-wrap gap-1 mt-1', todo.done && 'opacity-50')}>
                {workspace && (
                  <span
                    className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-medium truncate max-w-[9rem]"
                    style={{
                      backgroundColor: `${ACCENT_COLOR_MAP[workspace.color].hex}22`,
                      color: ACCENT_COLOR_MAP[workspace.color].hex,
                    }}
                  >
                    <span className="shrink-0">{workspace.emoji}</span>
                    <span className="truncate">{workspace.name}</span>
                  </span>
                )}
                {(todo.topics ?? []).slice(0, 4).map((topic) => (
                  <span
                    key={topic.id}
                    className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium bg-black/[0.06] dark:bg-white/[0.08] text-black/50 dark:text-white/50 truncate max-w-[7.5rem]"
                  >
                    {topic.name}
                  </span>
                ))}
                {(todo.topics ?? []).length > 4 && (
                  <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium text-black/40 dark:text-white/40">
                    +{(todo.topics ?? []).length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </button>

      <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
        {todo.done && todo.tracked_minutes != null && todo.tracked_minutes > 0 && (
          <span className="text-[11px] font-semibold tabular-nums text-black/40 dark:text-white/40 px-1">
            {formatMinutes(todo.tracked_minutes)}
          </span>
        )}
        {showTimer && (running || storedSeconds > 0) && (
          <span className="text-[11px] font-semibold tabular-nums text-accent-blue px-1 min-w-[2.5rem] text-right">
            {running ? formatElapsedClock(elapsedMs) : formatMinutes(minutesFromSeconds(storedSeconds))}
          </span>
        )}
        {showTimer && running && (
          <button
            type="button"
            onClick={() => void pause(todo.id)}
            aria-label="Pause timer"
            className="size-8 rounded-full flex items-center justify-center text-accent-orange hover:bg-accent-orange/10 transition-colors"
          >
            <Pause className="size-3.5 fill-current" />
          </button>
        )}
        {showTimer && workspace && !running && (
          <button
            type="button"
            onClick={() => void requestStart(todo.id)}
            aria-label={storedSeconds > 0 ? 'Resume timer' : 'Start timer'}
            title={storedSeconds > 0 ? 'Resume timer' : 'Start timer'}
            className="size-8 rounded-full flex items-center justify-center text-black/30 dark:text-white/30 hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
          >
            <Play className="size-3.5 fill-current" />
          </button>
        )}

        {(onMoveUp || onMoveDown) && (
          <div className="hidden sm:flex flex-col">
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
          onClick={() => onEdit(todo)}
          aria-label="Edit task"
          className="size-8 rounded-full flex items-center justify-center text-black/30 dark:text-white/30 hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
        >
          <Pencil className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          aria-label="Delete todo"
          className="size-8 rounded-full flex items-center justify-center text-black/30 dark:text-white/30 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </motion.div>
  )
}
