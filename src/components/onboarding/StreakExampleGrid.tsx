import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { firstGrapheme } from '@/components/ui/EmojiPicker'
import type { OnboardingStreakOption } from '@/lib/onboardingStreaks'

export interface CustomStreakOption {
  label: string
  emoji: string
}

export type StreakSelection =
  | { kind: 'preset'; id: string }
  | { kind: 'custom'; label: string; emoji: string }
  | null

interface StreakExampleGridProps {
  options: OnboardingStreakOption[]
  selection: StreakSelection
  onSelectPreset: (id: string) => void
  onSetCustom: (custom: CustomStreakOption) => void
  onClear: () => void
}

const DEFAULT_CUSTOM_EMOJI = '⭐'

/** Single-select emoji pills for picking one example habit to turn into a streak, plus "add your own". */
export function StreakExampleGrid({
  options,
  selection,
  onSelectPreset,
  onSetCustom,
  onClear,
}: StreakExampleGridProps) {
  const [addingCustom, setAddingCustom] = useState(false)
  const [customEmoji, setCustomEmoji] = useState(DEFAULT_CUSTOM_EMOJI)
  const [customLabel, setCustomLabel] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)

  const isCustomSelected = selection?.kind === 'custom'

  function openCustomForm() {
    setAddingCustom(true)
    setCustomEmoji(DEFAULT_CUSTOM_EMOJI)
    setCustomLabel('')
    window.setTimeout(() => labelInputRef.current?.focus(), 0)
  }

  function closeCustomForm() {
    setAddingCustom(false)
    setCustomEmoji(DEFAULT_CUSTOM_EMOJI)
    setCustomLabel('')
  }

  function submitCustom() {
    const label = customLabel.trim()
    if (!label) return
    onSetCustom({ label, emoji: customEmoji || DEFAULT_CUSTOM_EMOJI })
    closeCustomForm()
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap gap-2.5 justify-center">
        {options.map((option) => {
          const isSelected = selection?.kind === 'preset' && selection.id === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => (isSelected ? onClear() : onSelectPreset(option.id))}
              aria-pressed={isSelected}
              className={cn(
                'flex items-center gap-2 h-11 pl-3 pr-4 rounded-full text-[14px] font-medium transition-all active:scale-95',
                isSelected
                  ? 'bg-accent-blue/15 ring-2 ring-accent-blue text-accent-blue'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
              )}
            >
              <span className="text-lg leading-none">{option.emoji}</span>
              {option.label}
            </button>
          )
        })}

        {isCustomSelected && (
          <span className="flex items-center gap-2 h-11 pl-3 pr-2 rounded-full text-[14px] font-medium bg-accent-blue/15 ring-2 ring-accent-blue text-accent-blue">
            <span className="text-lg leading-none">{selection.emoji}</span>
            {selection.label}
            <button
              type="button"
              onClick={onClear}
              aria-label={`Remove ${selection.label}`}
              className="size-6 rounded-full flex items-center justify-center hover:bg-accent-blue/20 active:scale-90 transition-all"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}

        {!addingCustom && !isCustomSelected && (
          <button
            type="button"
            onClick={openCustomForm}
            className="flex items-center gap-1.5 h-11 pl-3 pr-4 rounded-full text-[14px] font-medium border border-dashed border-black/15 dark:border-white/20 text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all active:scale-95"
          >
            <Plus className="size-4" />
            Add your own
          </button>
        )}
      </div>

      {addingCustom && (
        <div className="glass-panel rounded-2xl p-3 flex items-center gap-2">
          <input
            type="text"
            inputMode="text"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Custom emoji"
            value={customEmoji}
            onChange={(e) => setCustomEmoji(firstGrapheme(e.target.value) || DEFAULT_CUSTOM_EMOJI)}
            className="size-11 shrink-0 rounded-xl text-center text-lg outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
          />
          <input
            ref={labelInputRef}
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="Name it…"
            value={customLabel}
            maxLength={40}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitCustom()
              } else if (e.key === 'Escape') {
                closeCustomForm()
              }
            }}
            className="flex-1 min-w-0 h-11 rounded-xl px-3 text-[15px] outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] placeholder:text-black/30 dark:placeholder:text-white/30 focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
          />
          <button
            type="button"
            onClick={submitCustom}
            disabled={!customLabel.trim()}
            className="h-11 px-4 rounded-xl text-[14px] font-semibold bg-accent-blue text-white disabled:opacity-40 active:scale-95 transition-all shrink-0"
          >
            Add
          </button>
          <button
            type="button"
            onClick={closeCustomForm}
            aria-label="Cancel"
            className="size-11 shrink-0 rounded-xl flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] active:scale-90 transition-all"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
