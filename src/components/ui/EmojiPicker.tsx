import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** First user-perceived character (handles multi-codepoint emoji / ZWJ sequences). */
export function firstGrapheme(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    const first = segmenter.segment(trimmed)[Symbol.iterator]().next().value
    return first?.segment ?? ''
  }
  return Array.from(trimmed)[0] ?? ''
}

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  options: readonly string[]
}

export function EmojiPicker({ value, onChange, options }: EmojiPickerProps) {
  const isPreset = options.includes(value)
  const [customText, setCustomText] = useState(isPreset ? '' : value)

  useEffect(() => {
    setCustomText(options.includes(value) ? '' : value)
  }, [value, options])

  function applyCustom(raw: string) {
    setCustomText(raw)
    const emoji = firstGrapheme(raw)
    if (emoji) onChange(emoji)
  }

  return (
    <div>
      <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Icon</span>
      <div className="grid grid-cols-8 gap-1.5 mt-1.5">
        {options.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              setCustomText('')
              onChange(emoji)
            }}
            className={cn(
              'aspect-square rounded-xl flex items-center justify-center text-lg transition-all',
              isPreset && value === emoji
                ? 'bg-accent-blue/15 ring-2 ring-accent-blue scale-105'
                : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Custom emoji"
          placeholder="Or type / paste your own"
          value={customText}
          onChange={(e) => applyCustom(e.target.value)}
          onBlur={() => {
            const emoji = firstGrapheme(customText)
            if (emoji) {
              onChange(emoji)
              setCustomText(options.includes(emoji) ? '' : emoji)
            } else if (!options.includes(value)) {
              setCustomText(value)
            } else {
              setCustomText('')
            }
          }}
          className={cn(
            'flex-1 h-10 rounded-xl px-3 text-[15px] outline-none transition-all',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'border border-black/[0.06] dark:border-white/[0.08]',
            'placeholder:text-black/30 dark:placeholder:text-white/30',
            'focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15',
            !isPreset && value
              ? 'ring-2 ring-accent-blue/40 border-accent-blue/40'
              : null,
          )}
        />
        {!isPreset && value ? (
          <span
            className="size-10 shrink-0 rounded-xl flex items-center justify-center text-lg bg-accent-blue/15 ring-2 ring-accent-blue"
            aria-hidden
          >
            {value}
          </span>
        ) : null}
      </div>
    </div>
  )
}
