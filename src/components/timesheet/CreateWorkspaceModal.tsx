import { useEffect, useState } from 'react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { ACCENT_COLORS, type AccentColor, type TimesheetWorkspace } from '@/lib/types'
import { useCreateTimesheetWorkspace, useUpdateTimesheetWorkspace } from '@/hooks/useTimesheetWorkspaces'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'

const WORKSPACE_EMOJI_OPTIONS = [
  '🗂️', '💼', '💻', '🎨', '📊', '🛠️', '📚', '🎧',
  '🧪', '📈', '🏗️', '✍️', '📷', '🎬', '🧾', '🌐',
]

interface CreateWorkspaceModalProps {
  open: boolean
  onClose: () => void
  editingWorkspace?: TimesheetWorkspace
}

function defaultState() {
  return { name: '', emoji: WORKSPACE_EMOJI_OPTIONS[0], color: 'blue' as AccentColor }
}

export function CreateWorkspaceModal({ open, onClose, editingWorkspace }: CreateWorkspaceModalProps) {
  const [state, setState] = useState(defaultState())
  const [error, setError] = useState<string | null>(null)
  const createWorkspace = useCreateTimesheetWorkspace()
  const updateWorkspace = useUpdateTimesheetWorkspace()
  const isEditing = Boolean(editingWorkspace)
  const pending = createWorkspace.isPending || updateWorkspace.isPending

  useEffect(() => {
    if (!open) return
    if (editingWorkspace) {
      setState({ name: editingWorkspace.name, emoji: editingWorkspace.emoji, color: editingWorkspace.color })
    } else {
      setState(defaultState())
    }
    setError(null)
  }, [open, editingWorkspace])

  async function handleSubmit() {
    if (!state.name.trim()) {
      setError('Give your workspace a name.')
      return
    }
    setError(null)

    const input = { name: state.name.trim(), emoji: state.emoji, color: state.color }

    try {
      if (editingWorkspace) {
        await updateWorkspace.mutateAsync({ id: editingWorkspace.id, input })
      } else {
        await createWorkspace.mutateAsync(input)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save workspace.'))
    }
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEditing ? 'Edit Workspace' : 'New Workspace'}>
      <div className="flex flex-col gap-5">
        <TextField
          label="Name"
          placeholder="e.g. Freelance design"
          value={state.name}
          maxLength={40}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          autoFocus
        />

        <div>
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Icon</span>
          <div className="grid grid-cols-8 gap-1.5 mt-1.5">
            {WORKSPACE_EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setState((s) => ({ ...s, emoji }))}
                className={cn(
                  'aspect-square rounded-xl flex items-center justify-center text-lg transition-all',
                  state.emoji === emoji
                    ? 'bg-accent-blue/15 ring-2 ring-accent-blue scale-105'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Color</span>
          <div className="flex flex-wrap gap-2.5 mt-1.5">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => setState((s) => ({ ...s, color }))}
                className={cn(
                  'size-8 rounded-full transition-all',
                  state.color === color && 'ring-2 ring-offset-2 ring-offset-transparent scale-110',
                )}
                style={{
                  backgroundColor: ACCENT_COLOR_MAP[color].hex,
                  boxShadow: state.color === color ? `0 0 0 2px ${ACCENT_COLOR_MAP[color].hex}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-[13px] text-accent-red text-center -mb-2">{error}</p>}

        <Button onClick={handleSubmit} loading={pending} size="lg" className="w-full">
          {isEditing ? 'Save Changes' : 'Create Workspace'}
        </Button>
      </div>
    </GlassModal>
  )
}
