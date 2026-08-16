import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Pencil, RotateCcw } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ImportanceMeter, IMPORTANCE_OPTIONS } from '@/components/todos/ImportanceMeter'
import { TopicChipList, TopicPicker } from '@/components/todos/TopicPicker'
import { PushEnableHint } from '@/components/pwa/PushEnableHint'
import { Switch } from '@/components/ui/Switch'
import { useCreateTodo, useTodoTopics, useUpdateTodo } from '@/hooks/useTodos'
import { useTodoTimer } from '@/hooks/useTodoTimer'
import { formatElapsedClock, minutesFromSeconds } from '@/lib/todoTimerLogic'
import { cn, formatMinutes, fromDateKey } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import type { Todo, TodoImportance } from '@/lib/types'

export type TodoModalMode = 'create' | 'view' | 'edit'

interface CreateTodoModalProps {
  open: boolean
  onClose: () => void
  /** Existing task for view/edit flows. */
  todo?: Todo
  /** Opening mode. Defaults to create, or edit when a todo is provided without mode. */
  mode?: TodoModalMode
  /** Prefills the title when opening a brand-new task (e.g. from the quick-add bar). */
  initialTitle?: string
}

function defaultState(initialTitle = '') {
  return {
    title: initialTitle,
    notes: '',
    dueDate: '',
    importance: 2 as TodoImportance,
    topicNames: [] as string[],
    notifyEnabled: false,
  }
}

function formatDueDate(dueDate: string) {
  try {
    return format(fromDateKey(dueDate), 'EEEE, MMM d, yyyy')
  } catch {
    return dueDate
  }
}

export function CreateTodoModal({ open, onClose, todo, mode: modeProp, initialTitle }: CreateTodoModalProps) {
  const inferredMode: TodoModalMode = modeProp ?? (todo ? 'edit' : 'create')
  const [mode, setMode] = useState<TodoModalMode>(inferredMode)
  const [state, setState] = useState(() => defaultState(initialTitle))
  const [error, setError] = useState<string | null>(null)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const { data: existingTopics } = useTodoTopics()
  const { timerFor, elapsedMsFor, storedSecondsFor, clearTimer, isSyncing } = useTodoTimer()
  const [resetting, setResetting] = useState(false)
  const pending = createTodo.isPending || updateTodo.isPending || resetting
  const isView = mode === 'view'
  const isEditing = mode === 'edit'

  useEffect(() => {
    if (!open) return
    const nextMode = modeProp ?? (todo ? 'edit' : 'create')
    setMode(nextMode)
    if (todo) {
      setState({
        title: todo.title,
        notes: todo.notes ?? '',
        dueDate: todo.due_date ?? '',
        importance: todo.importance ?? 2,
        topicNames: (todo.topics ?? []).map((t) => t.name),
        notifyEnabled: Boolean(todo.notify_enabled),
      })
    } else {
      setState(defaultState(initialTitle ?? ''))
    }
    setError(null)
  }, [open, todo, initialTitle, modeProp])

  const timer = todo ? timerFor(todo.id) : null
  const elapsedMs = todo ? elapsedMsFor(todo.id) : 0
  const storedSeconds = todo ? storedSecondsFor(todo.id) : 0
  const hasTimer = Boolean(timer) || elapsedMs > 0 || storedSeconds > 0
  const timerLabel = timer?.runningSince
    ? formatElapsedClock(elapsedMs)
    : storedSeconds > 0
      ? formatMinutes(minutesFromSeconds(storedSeconds))
      : elapsedMs > 0
        ? formatElapsedClock(elapsedMs)
        : null

  async function handleResetTimer() {
    if (!todo) return
    setError(null)
    setResetting(true)
    try {
      await clearTimer(todo.id)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset the timer.'))
    } finally {
      setResetting(false)
    }
  }

  async function handleSubmit() {
    if (!state.title.trim()) {
      setError('Give your task a title.')
      return
    }
    if (state.notifyEnabled && !state.dueDate) {
      setError('Set a due date to enable reminders.')
      return
    }
    setError(null)

    const input = {
      title: state.title.trim(),
      notes: state.notes.trim() ? state.notes.trim() : null,
      due_date: state.dueDate || null,
      importance: state.importance,
      notify_enabled: state.notifyEnabled && Boolean(state.dueDate),
      topicNames: state.topicNames,
    }

    try {
      if (todo && isEditing) {
        await updateTodo.mutateAsync({ id: todo.id, input })
      } else if (!todo) {
        await createTodo.mutateAsync(input)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save task.'))
    }
  }

  const title = mode === 'create' ? 'New Task' : mode === 'view' ? 'Task' : 'Edit Task'
  const importanceLabel = IMPORTANCE_OPTIONS.find((o) => o.value === state.importance)?.label ?? 'Medium'

  return (
    <GlassModal open={open} onClose={onClose} title={title}>
      {isView ? (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Title</p>
            <p className="text-[17px] font-semibold tracking-tight break-words">{state.title || 'Untitled'}</p>
          </div>

          <div>
            <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Notes</p>
            <p className="text-[15px] text-black/70 dark:text-white/70 whitespace-pre-wrap break-words">
              {state.notes.trim() ? state.notes : 'No notes'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Due date</p>
              <p className="text-[15px] text-black/70 dark:text-white/70">
                {state.dueDate ? formatDueDate(state.dueDate) : 'None'}
              </p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Importance</p>
              <div className="flex items-center gap-2 mt-0.5">
                <ImportanceMeter value={state.importance} size="sm" />
                <span className="text-[15px] text-black/70 dark:text-white/70">{importanceLabel}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Reminders</p>
            <p className="text-[15px] text-black/70 dark:text-white/70">
              {state.notifyEnabled ? 'On — 8pm on/after the due day until done' : 'Off'}
            </p>
          </div>

          <div>
            <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Topics</p>
            {state.topicNames.length > 0 ? (
              <TopicChipList names={state.topicNames} />
            ) : (
              <p className="text-[15px] text-black/70 dark:text-white/70">None</p>
            )}
          </div>

          {todo?.done && (
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium text-accent-green">Completed</p>
              {todo.tracked_minutes != null && todo.tracked_minutes > 0 && (
                <p className="text-[14px] text-black/55 dark:text-white/55">
                  Tracked time · {formatMinutes(todo.tracked_minutes)}
                </p>
              )}
            </div>
          )}

          <Button onClick={() => setMode('edit')} size="lg" className="w-full">
            <Pencil className="size-4" />
            Edit task
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <TextField
            label="Title"
            placeholder="e.g. Reply to invoice email"
            value={state.title}
            maxLength={200}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
            autoFocus
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Notes</span>
            <textarea
              value={state.notes}
              onChange={(e) => setState((s) => ({ ...s, notes: e.target.value.slice(0, 1000) }))}
              placeholder="Optional details"
              rows={3}
              className={cn(
                'rounded-2xl px-4 py-3 text-[15px] outline-none transition-all resize-none',
                'bg-black/[0.04] dark:bg-white/[0.06]',
                'border border-black/[0.06] dark:border-white/[0.08]',
                'placeholder:text-black/30 dark:placeholder:text-white/30',
                'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
              )}
            />
          </label>

          <TextField
            label="Due date"
            type="date"
            value={state.dueDate}
            onChange={(e) => {
              const dueDate = e.target.value
              setState((s) => ({
                ...s,
                dueDate,
                notifyEnabled: dueDate ? s.notifyEnabled : false,
              }))
            }}
          />

          <div className="glass-panel rounded-2xl p-4">
            <Switch
              checked={state.notifyEnabled}
              disabled={!state.dueDate}
              onChange={(checked) => setState((s) => ({ ...s, notifyEnabled: checked }))}
              label="Notify me"
              description={
                state.dueDate
                  ? 'We’ll remind you at 8pm on the due day, then daily until it’s done.'
                  : 'Set a due date first to enable reminders.'
              }
            />
            {state.notifyEnabled && <PushEnableHint />}
          </div>

          <TopicPicker
            selected={state.topicNames}
            existing={existingTopics ?? []}
            onChange={(topicNames) => setState((s) => ({ ...s, topicNames }))}
            disabled={pending}
          />

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Importance</span>
            <div className="flex items-center justify-between gap-3 glass-panel rounded-2xl px-4 py-3">
              <ImportanceMeter
                value={state.importance}
                onChange={(importance) => setState((s) => ({ ...s, importance }))}
              />
              <div className="flex gap-1.5">
                {IMPORTANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, importance: opt.value }))}
                    className={cn(
                      'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                      state.importance === opt.value
                        ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-[13px] text-accent-red text-center -mb-2">{error}</p>}

          {isEditing && todo && hasTimer && (
            <button
              type="button"
              onClick={() => void handleResetTimer()}
              disabled={pending || isSyncing}
              className="h-11 rounded-2xl text-[14px] font-medium text-accent-red hover:bg-accent-red/10 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <RotateCcw className="size-4" />
                Reset timer{timerLabel ? ` (${timerLabel})` : ''}
              </span>
            </button>
          )}

          <div className={cn('flex gap-2', isEditing && todo ? 'flex-col' : '')}>
            {isEditing && todo && (
              <Button variant="secondary" onClick={() => setMode('view')} size="lg" className="w-full" disabled={pending}>
                Cancel editing
              </Button>
            )}
            <Button onClick={handleSubmit} loading={pending} size="lg" className="w-full">
              {isEditing ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </div>
      )}
    </GlassModal>
  )
}
