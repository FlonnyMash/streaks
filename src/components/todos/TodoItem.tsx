import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { ImportanceMeter } from '@/components/todos/ImportanceMeter'
import { ParticleBurst } from '@/components/streaks/ParticleBurst'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { formatElapsedClock, minutesFromSeconds } from '@/lib/todoTimerLogic'
import { hapticTick, hapticUndo } from '@/lib/haptics'
import { ROUTINE_ACCENT, ROUTINE_ICONS, ROUTINE_LABELS } from '@/lib/routineLogic'
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
  const { requestStart, pause, elapsedMsFor, storedSecondsFor, timerFor } = useTodoTimer()
  const [showBurst, setShowBurst] = useState(false)
  const routine = todo.routine ?? 'anytime'
  const RoutineIcon = ROUTINE_ICONS[routine]
  const routineAccent = ROUTINE_ACCENT[routine]

  const timer = timerFor(todo.id)
  const running = Boolean(timer?.runningSince)
  const storedSeconds = storedSecondsFor(todo.id)
  const showTimer = !todo.done
  const elapsedMs = elapsedMsFor(todo.id)

  function handleToggleClick() {
    const nextDone = !todo.done
    if (nextDone) {
      hapticTick()
      setShowBurst(true)
    } else {
      hapticUndo()
    }
    onToggle(todo.id, nextDone)
  }

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
        onClick={handleToggleClick}
        aria-label={todo.done ? 'Mark as not done' : 'Mark as done'}
        className={cn(
          'relative shrink-0 size-6 mt-0.5 rounded-full flex items-center justify-center transition-all active:scale-90 border-2',
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
        {showBurst && <ParticleBurst color={routineAccent.hex} onComplete={() => setShowBurst(false)} />}
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
        {(due ||
          notesPreview ||
          (todo.topics ?? []).length > 0 ||
          (todo.done && todo.tracked_minutes) ||
          routine !== 'anytime' ||
          todo.estimated_minutes) && (
          <div className="mt-0.5 min-w-0">
            {(due || routine !== 'anytime' || todo.estimated_minutes) && (
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
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
                {routine !== 'anytime' && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-medium',
                      todo.done ? 'text-black/25 dark:text-white/25' : routineAccent.text,
                    )}
                  >
                    <RoutineIcon className="size-3" />
                    {ROUTINE_LABELS[routine]}
                  </span>
                )}
                {todo.estimated_minutes != null && (
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      todo.done ? 'text-black/25 dark:text-white/25' : 'text-black/45 dark:text-white/45',
                    )}
                  >
                    ~{formatMinutes(todo.estimated_minutes)}
                  </span>
                )}
              </div>
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
            {(todo.topics ?? []).length > 0 && (
              <div className={cn('flex flex-wrap gap-1 mt-1', todo.done && 'opacity-50')}>
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
        {showTimer && !running && (
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
          <div className="hidden app-desktop:flex flex-col">
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
