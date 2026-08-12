import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ACCENT_COLOR_MAP } from '@/lib/accentColors'
import { ACCENT_COLORS, type AccentColor, type TimesheetWorkspace } from '@/lib/types'
import { useCreateTimesheetWorkspace, useUpdateTimesheetWorkspace } from '@/hooks/useTimesheetWorkspaces'
import {
  DEFAULT_QUICK_PRESETS,
  addQuickPreset,
  normalizeQuickPresets,
  removeQuickPreset,
} from '@/lib/timesheetLogic'
import { cn, formatMinutes } from '@/lib/utils'
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
  return {
    name: '',
    emoji: WORKSPACE_EMOJI_OPTIONS[0],
    color: 'blue' as AccentColor,
    quickPresets: [...DEFAULT_QUICK_PRESETS],
    newHours: '0',
    newMinutes: '15',
  }
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
      setState({
        name: editingWorkspace.name,
        emoji: editingWorkspace.emoji,
        color: editingWorkspace.color,
        quickPresets: normalizeQuickPresets(editingWorkspace.quick_presets),
        newHours: '0',
        newMinutes: '15',
      })
    } else {
      setState(defaultState())
    }
    setError(null)
  }, [open, editingWorkspace])

  function handleAddPreset() {
    const hours = Math.max(0, Number.parseInt(state.newHours, 10) || 0)
    const minutes = Math.max(0, Number.parseInt(state.newMinutes, 10) || 0)
    const total = hours * 60 + minutes
    if (total <= 0) {
      setError('Pick a time greater than 0 to save as a quick select.')
      return
    }
    setError(null)
    setState((s) => ({
      ...s,
      quickPresets: addQuickPreset(s.quickPresets, total),
      newHours: '0',
      newMinutes: '15',
    }))
  }

  async function handleSubmit() {
    if (!state.name.trim()) {
      setError('Give your workspace a name.')
      return
    }
    setError(null)

    const input = {
      name: state.name.trim(),
      emoji: state.emoji,
      color: state.color,
      quick_presets: normalizeQuickPresets(state.quickPresets),
    }

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

        <div>
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Quick select times</span>
          <p className="text-[12px] text-black/40 dark:text-white/40 px-0.5 mt-0.5 mb-2">
            Shown as fast chips when logging time on a day.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {state.quickPresets.map((preset) => (
              <div key={preset} className="relative">
                <span className="inline-flex h-8 items-center pl-3 pr-7 rounded-full text-[12px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-black/60 dark:text-white/60">
                  {formatMinutes(preset)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${formatMinutes(preset)}`}
                  onClick={() =>
                    setState((s) => ({ ...s, quickPresets: removeQuickPreset(s.quickPresets, preset) }))
                  }
                  className="absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center bg-black/10 dark:bg-white/15 text-black/50 dark:text-white/50 hover:bg-accent-red hover:text-white transition-colors"
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={24}
              value={state.newHours}
              onChange={(e) => setState((s) => ({ ...s, newHours: e.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
              aria-label="Preset hours"
              className="w-12 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-center text-[15px] font-semibold tabular-nums outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[12px] text-black/45 dark:text-white/45">h</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={state.newMinutes}
              onChange={(e) => setState((s) => ({ ...s, newMinutes: e.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
              aria-label="Preset minutes"
              className="w-12 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-center text-[15px] font-semibold tabular-nums outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[12px] text-black/45 dark:text-white/45">m</span>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddPreset} className="ml-auto">
              <Plus className="size-3.5" />
              Add
            </Button>
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
