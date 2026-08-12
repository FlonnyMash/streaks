import { useEffect, useState } from 'react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { useCreateTodo, useUpdateTodo } from '@/hooks/useTodos'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import type { Todo } from '@/lib/types'

interface CreateTodoModalProps {
  open: boolean
  onClose: () => void
  editingTodo?: Todo
}

function defaultState() {
  return { title: '', notes: '', dueDate: '' }
}

export function CreateTodoModal({ open, onClose, editingTodo }: CreateTodoModalProps) {
  const [state, setState] = useState(defaultState())
  const [error, setError] = useState<string | null>(null)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const isEditing = Boolean(editingTodo)
  const pending = createTodo.isPending || updateTodo.isPending

  useEffect(() => {
    if (!open) return
    if (editingTodo) {
      setState({
        title: editingTodo.title,
        notes: editingTodo.notes ?? '',
        dueDate: editingTodo.due_date ?? '',
      })
    } else {
      setState(defaultState())
    }
    setError(null)
  }, [open, editingTodo])

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
    }

    try {
      if (editingTodo) {
        await updateTodo.mutateAsync({ id: editingTodo.id, input })
      } else {
        await createTodo.mutateAsync(input)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save task.'))
    }
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEditing ? 'Edit Task' : 'New Task'}>
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

        {error && <p className="text-[13px] text-accent-red text-center -mb-2">{error}</p>}

        <Button onClick={handleSubmit} loading={pending} size="lg" className="w-full">
          {isEditing ? 'Save Changes' : 'Add Task'}
        </Button>
      </div>
    </GlassModal>
  )
}
