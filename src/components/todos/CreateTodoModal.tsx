import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ImportanceMeter, IMPORTANCE_OPTIONS } from '@/components/todos/ImportanceMeter'
import { TopicChipList, TopicPicker } from '@/components/todos/TopicPicker'
import { useCreateTodo, useTodoTopics, useUpdateTodo } from '@/hooks/useTodos'
import { useTimesheetWorkspaces } from '@/hooks/useTimesheetWorkspaces'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { cn, fromDateKey } from '@/lib/utils'
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
    workspaceId: '' as string,
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
  const { data: workspaces } = useTimesheetWorkspaces()
  const pending = createTodo.isPending || updateTodo.isPending
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
        workspaceId: todo.workspace_id ?? '',
      })
    } else {
      setState(defaultState(initialTitle ?? ''))
    }
    setError(null)
  }, [open, todo, initialTitle, modeProp])

  async function handleSubmit() {
    if (!state.title.trim()) {
      setError('Give your task a title.')
      return
    }
    setError(null)

    const input = {
      title: state.title.trim(),
      notes: state.notes.trim() ? state.notes.trim() : null,
      due_date: state.dueDate || null,
      importance: state.importance,
      workspace_id: state.workspaceId || null,
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
  const selectedWorkspace = (workspaces ?? []).find((w) => w.id === state.workspaceId)

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
            <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Topics</p>
            {state.topicNames.length > 0 ? (
              <TopicChipList names={state.topicNames} />
            ) : (
              <p className="text-[15px] text-black/70 dark:text-white/70">None</p>
            )}
          </div>

          <div>
            <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">Workspace</p>
            {selectedWorkspace ? (
              <div className="flex items-center gap-3">
                <div
                  className="size-8 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: `${ACCENT_COLOR_MAP[selectedWorkspace.color].hex}22` }}
                >
                  {selectedWorkspace.emoji}
                </div>
                <p className="text-[15px] text-black/70 dark:text-white/70 truncate">{selectedWorkspace.name}</p>
              </div>
            ) : (
              <p className="text-[15px] text-black/70 dark:text-white/70">None</p>
            )}
          </div>

          {todo?.done && (
            <p className="text-[13px] font-medium text-accent-green">Completed</p>
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
            onChange={(e) => setState((s) => ({ ...s, dueDate: e.target.value }))}
          />

          <TopicPicker
            selected={state.topicNames}
            existing={existingTopics ?? []}
            onChange={(topicNames) => setState((s) => ({ ...s, topicNames }))}
            disabled={pending}
          />

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Workspace</span>
            <p className="text-[12px] text-black/45 dark:text-white/45 -mt-1 px-0.5">
              Optional. Play starts a timer on this timesheet.
            </p>
            {(workspaces ?? []).length === 0 ? (
              <p className="text-[13px] text-black/50 dark:text-white/50 px-0.5">
                No workspaces yet.{' '}
                <Link to="/timesheet" className="text-accent-blue font-medium">
                  Create one in Timesheet
                </Link>{' '}
                to track time from tasks.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, workspaceId: '' }))}
                  disabled={pending}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all',
                    !state.workspaceId
                      ? 'bg-accent-blue/10 ring-1 ring-accent-blue'
                      : 'bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
                  )}
                >
                  <span className="text-[14px] font-medium">None</span>
                </button>
                {(workspaces ?? []).map((workspace) => {
                  const accent = ACCENT_COLOR_MAP[workspace.color]
                  const selected = state.workspaceId === workspace.id
                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() => setState((s) => ({ ...s, workspaceId: workspace.id }))}
                      disabled={pending}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all',
                        selected
                          ? 'bg-accent-blue/10 ring-1 ring-accent-blue'
                          : 'bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
                      )}
                    >
                      <div
                        className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${accent.hex}22` }}
                      >
                        {workspace.emoji}
                      </div>
                      <span className="font-medium truncate">{workspace.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

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
