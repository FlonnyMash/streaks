import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { RoutineItemRow } from '@/components/calendar/RoutineItemRow'
import { firstGrapheme } from '@/components/ui/EmojiPicker'
import { ROUTINE_ACCENT, ROUTINE_ICONS, ROUTINE_LABELS } from '@/lib/routineLogic'
import { cn } from '@/lib/utils'
import type { CalendarRoutineItem, RoutineBlock } from '@/lib/types'

type DayRoutineBlock = Exclude<RoutineBlock, 'anytime'>

const BLOCKS: DayRoutineBlock[] = ['morning', 'afternoon', 'evening']
const DEFAULT_ADD_EMOJI = '⭐'

interface DayRoutineBoardProps {
  items: CalendarRoutineItem[]
  completedItemIds: Set<string>
  onToggle: (itemId: string, completed: boolean) => void
  onAddItem: (block: DayRoutineBlock, title: string, emoji: string) => void
}

function groupByBlock(items: CalendarRoutineItem[]): Record<DayRoutineBlock, CalendarRoutineItem[]> {
  const groups: Record<DayRoutineBlock, CalendarRoutineItem[]> = { morning: [], afternoon: [], evening: [] }
  for (const item of items) groups[item.block].push(item)
  for (const block of BLOCKS) groups[block].sort((a, b) => a.position - b.position)
  return groups
}

/** Always-on Morning / Afternoon / Evening containers for the calendar day view — the same routine templates repeat every day. */
export function DayRoutineBoard({ items, completedItemIds, onToggle, onAddItem }: DayRoutineBoardProps) {
  const grouped = groupByBlock(items)

  return (
    <div className="flex flex-col gap-5">
      {BLOCKS.map((block) => (
        <RoutineBlockSection
          key={block}
          block={block}
          items={grouped[block]}
          completedItemIds={completedItemIds}
          onToggle={onToggle}
          onAddItem={onAddItem}
        />
      ))}
    </div>
  )
}

function RoutineBlockSection({
  block,
  items,
  completedItemIds,
  onToggle,
  onAddItem,
}: {
  block: DayRoutineBlock
  items: CalendarRoutineItem[]
  completedItemIds: Set<string>
  onToggle: (itemId: string, completed: boolean) => void
  onAddItem: (block: DayRoutineBlock, title: string, emoji: string) => void
}) {
  const Icon = ROUTINE_ICONS[block]
  const accent = ROUTINE_ACCENT[block]
  const doneCount = items.filter((i) => completedItemIds.has(i.id)).length

  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={cn('size-6 rounded-full flex items-center justify-center', accent.bg)}>
          <Icon className={cn('size-3.5', accent.text)} />
        </div>
        <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide">
          {ROUTINE_LABELS[block]}
          {items.length > 0 ? ` · ${doneCount}/${items.length}` : ''}
        </h2>
      </div>

      <div className="glass-panel rounded-[24px] overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-black/40 dark:text-white/40">Nothing added yet.</p>
        ) : (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <RoutineItemRow
                  key={item.id}
                  item={item}
                  completed={completedItemIds.has(item.id)}
                  onToggle={(completed) => onToggle(item.id, completed)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        <AddRoutineItemRow block={block} onAdd={(title, emoji) => onAddItem(block, title, emoji)} />
      </div>
    </section>
  )
}

function AddRoutineItemRow({
  block,
  onAdd,
}: {
  block: DayRoutineBlock
  onAdd: (title: string, emoji: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [emoji, setEmoji] = useState(DEFAULT_ADD_EMOJI)
  const [title, setTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  function openForm() {
    setOpen(true)
    setEmoji(DEFAULT_ADD_EMOJI)
    setTitle('')
    window.setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  function closeForm() {
    setOpen(false)
    setEmoji(DEFAULT_ADD_EMOJI)
    setTitle('')
  }

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd(trimmed, emoji || DEFAULT_ADD_EMOJI)
    closeForm()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openForm}
        className="w-full flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-black/45 dark:text-white/45 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border-t border-black/[0.06] dark:border-white/[0.08] transition-colors"
      >
        <Plus className="size-4" />
        Add to {ROUTINE_LABELS[block].toLowerCase()}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 border-t border-black/[0.06] dark:border-white/[0.08]">
      <input
        type="text"
        inputMode="text"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Custom emoji"
        value={emoji}
        onChange={(e) => setEmoji(firstGrapheme(e.target.value) || DEFAULT_ADD_EMOJI)}
        className="size-11 shrink-0 rounded-xl text-center text-lg outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
      />
      <input
        ref={titleInputRef}
        type="text"
        enterKeyHint="done"
        autoComplete="off"
        placeholder="Name it…"
        value={title}
        maxLength={60}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape') {
            closeForm()
          }
        }}
        className="flex-1 min-w-0 h-11 rounded-xl px-3 text-[15px] outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] placeholder:text-black/30 dark:placeholder:text-white/30 focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!title.trim()}
        className="h-11 px-4 rounded-xl text-[14px] font-semibold bg-accent-blue text-white disabled:opacity-40 active:scale-95 transition-all shrink-0"
      >
        Add
      </button>
      <button
        type="button"
        onClick={closeForm}
        aria-label="Cancel"
        className="size-11 shrink-0 rounded-xl flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] active:scale-90 transition-all"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
