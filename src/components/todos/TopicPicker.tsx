import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeTopicName, TODO_TOPIC_MAX_LENGTH } from '@/lib/todoLogic'
import type { TodoTopic } from '@/lib/types'

interface TopicPickerProps {
  selected: string[]
  existing: TodoTopic[]
  onChange: (names: string[]) => void
  disabled?: boolean
}

export function TopicPicker({ selected, existing, onChange, disabled }: TopicPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLower = useMemo(() => new Set(selected.map((n) => n.toLowerCase())), [selected])
  const trimmedQuery = normalizeTopicName(query)

  const suggestions = useMemo(() => {
    const unused = existing.filter((t) => !selectedLower.has(t.name.toLowerCase()))
    if (!trimmedQuery) return unused
    return unused.filter((t) => t.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
  }, [existing, selectedLower, trimmedQuery])

  const exactMatch = existing.find((t) => t.name.toLowerCase() === trimmedQuery.toLowerCase())
  const canCreate =
    trimmedQuery.length > 0 &&
    !selectedLower.has(trimmedQuery.toLowerCase()) &&
    !exactMatch

  function addName(name: string) {
    const normalized = normalizeTopicName(name)
    if (!normalized) return
    if (selectedLower.has(normalized.toLowerCase())) {
      setQuery('')
      return
    }
    const canonical =
      existing.find((t) => t.name.toLowerCase() === normalized.toLowerCase())?.name ?? normalized
    onChange([...selected, canonical])
    setQuery('')
    inputRef.current?.focus()
  }

  function removeName(name: string) {
    onChange(selected.filter((n) => n.toLowerCase() !== name.toLowerCase()))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (trimmedQuery) addName(trimmedQuery)
      return
    }
    if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      onChange(selected.slice(0, -1))
    }
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showMenu = open && !disabled && (suggestions.length > 0 || canCreate)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Topics</span>
      <div
        className={cn(
          'rounded-2xl px-3 py-2 min-h-12 outline-none transition-all',
          'bg-black/[0.04] dark:bg-white/[0.06]',
          'border border-black/[0.06] dark:border-white/[0.08]',
          'focus-within:border-accent-blue focus-within:bg-white dark:focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-accent-blue/15',
          disabled && 'opacity-60 pointer-events-none',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {selected.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full text-[12px] font-medium bg-accent-blue/15 text-accent-blue"
            >
              {name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeName(name)
                }}
                aria-label={`Remove ${name}`}
                className="size-5 rounded-full inline-flex items-center justify-center hover:bg-accent-blue/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.slice(0, TODO_TOPIC_MAX_LENGTH))
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 120)
            }}
            onKeyDown={handleKeyDown}
            placeholder={selected.length === 0 ? 'Pick or create a topic' : 'Add another…'}
            maxLength={TODO_TOPIC_MAX_LENGTH}
            disabled={disabled}
            className="flex-1 min-w-[8rem] h-8 bg-transparent outline-none text-[15px] placeholder:text-black/30 dark:placeholder:text-white/30"
          />
        </div>
      </div>

      {showMenu && (
        <ul
          role="listbox"
          className="glass-panel rounded-2xl py-1.5 max-h-48 overflow-y-auto"
        >
          {suggestions.map((topic) => (
            <li key={topic.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addName(topic.name)}
                className="w-full text-left px-3.5 py-2 text-[14px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                {topic.name}
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addName(trimmedQuery)}
                className="w-full text-left px-3.5 py-2 text-[14px] text-accent-blue hover:bg-accent-blue/10"
              >
                Create “{trimmedQuery}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function TopicChipList({ names, className }: { names: string[]; className?: string }) {
  if (names.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium bg-black/[0.06] dark:bg-white/[0.08] text-black/55 dark:text-white/55"
        >
          {name}
        </span>
      ))}
    </div>
  )
}
