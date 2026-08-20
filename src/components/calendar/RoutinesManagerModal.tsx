import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { ChevronLeft, Plus, Trash2, X } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { firstGrapheme } from '@/components/ui/EmojiPicker'
import {
  useArchiveCalendarRoutine,
  useArchiveCalendarRoutineItem,
  useCalendarRoutineItems,
  useCalendarRoutineOverride,
  useCalendarRoutines,
  useClearCalendarRoutineOverrideForDate,
  useCreateCalendarRoutine,
  useCreateCalendarRoutineItem,
  useSetCalendarRoutineOverrideRange,
  useSetCalendarRoutineSchedule,
  useUpdateCalendarRoutine,
  useUpdateCalendarRoutineItem,
} from '@/hooks/useCalendarRoutines'
import {
  DEFAULT_ROUTINE_PACK_EMOJI,
  EVERY_DAY_SCHEDULE,
  WEEKDAY_LABELS,
  WEEKDAY_SCHEDULE,
  WEEKEND_SCHEDULE,
  SCHEDULE_DAY_ORDER,
  schedulePresetFor,
  type SchedulePreset,
} from '@/lib/calendarRoutinePacks'
import { ROUTINE_ICONS, ROUTINE_LABELS } from '@/lib/routineLogic'
import { cn, fromDateKey, toDateKey } from '@/lib/utils'
import type { CalendarRoutine, CalendarRoutineItem, CalendarRoutineOverride, RoutineBlock } from '@/lib/types'

type DayBlock = Exclude<RoutineBlock, 'anytime'>
const BLOCKS: DayBlock[] = ['morning', 'afternoon', 'evening']
const DEFAULT_ITEM_EMOJI = '⭐'
const FULL_WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SCHEDULE_PRESET_CHIPS: { key: Exclude<SchedulePreset, 'custom'>; label: string; days: number[] }[] = [
  { key: 'weekdays', label: 'Weekdays', days: WEEKDAY_SCHEDULE },
  { key: 'weekends', label: 'Weekends', days: WEEKEND_SCHEDULE },
  { key: 'everyday', label: 'Every day', days: EVERY_DAY_SCHEDULE },
  { key: 'none', label: 'None', days: [] },
]

/** Short badge text for a pack's schedule, or null when it's manual-only ("None"). */
function scheduleBadgeLabel(days: number[] | null): string | null {
  const preset = schedulePresetFor(days)
  if (preset === 'none') return null
  if (preset === 'weekdays') return 'Weekdays'
  if (preset === 'weekends') return 'Weekends'
  if (preset === 'everyday') return 'Every day'
  return (days ?? [])
    .slice()
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => SHORT_WEEKDAY_NAMES[d])
    .join(', ')
}

function formatOverrideRange(override: CalendarRoutineOverride): string {
  const start = format(fromDateKey(override.start_date), 'MMM d')
  if (!override.end_date) return `Active from ${start}, until switched back`
  if (override.end_date === override.start_date) return `Active on ${start}`
  const end = format(fromDateKey(override.end_date), 'MMM d')
  return `Active ${start} – ${end}`
}

interface RoutinesManagerModalProps {
  open: boolean
  onClose: () => void
  selectedDateKey: string
  selectedDateLabel: string
  /** Opens the editor for this pack as soon as the modal is shown. */
  startEditingId?: string | null
  /** Opens the new-routine form as soon as the modal is shown. */
  startCreate?: boolean
}

/** Create/edit/switch named calendar routine packs (Weekdays, Weekend, Holiday, ...). */
export function RoutinesManagerModal({
  open,
  onClose,
  selectedDateKey,
  selectedDateLabel,
  startEditingId,
  startCreate,
}: RoutinesManagerModalProps) {
  const { data: routines } = useCalendarRoutines()
  const { data: items } = useCalendarRoutineItems()
  const { data: activeOverride } = useCalendarRoutineOverride(selectedDateKey)

  const createRoutine = useCreateCalendarRoutine()
  const updateRoutine = useUpdateCalendarRoutine()
  const archiveRoutine = useArchiveCalendarRoutine()
  const setSchedule = useSetCalendarRoutineSchedule()
  const createItem = useCreateCalendarRoutineItem()
  const updateItem = useUpdateCalendarRoutineItem()
  const archiveItem = useArchiveCalendarRoutineItem()
  const setOverrideRange = useSetCalendarRoutineOverrideRange()
  const clearOverride = useClearCalendarRoutineOverrideForDate(selectedDateKey)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (open && startEditingId) setEditingId(startEditingId)
    if (open && startCreate) {
      setEditingId(null)
      setShowCreate(true)
    }
    if (!open) {
      setEditingId(null)
      setShowCreate(false)
    }
  }, [open, startEditingId, startCreate])

  const packs = useMemo(() => routines ?? [], [routines])
  const editingPack = packs.find((r) => r.id === editingId) ?? null

  function closeAndReset() {
    setEditingId(null)
    setShowCreate(false)
    onClose()
  }

  return (
    <GlassModal open={open} onClose={closeAndReset} title="Routines" className="app-desktop:max-w-lg">
      {editingPack ? (
        <RoutineEditor
          pack={editingPack}
          items={(items ?? []).filter((i) => i.routine_id === editingPack.id)}
          activeOverride={activeOverride?.routine_id === editingPack.id ? activeOverride : null}
          selectedDateKey={selectedDateKey}
          selectedDateLabel={selectedDateLabel}
          canArchive={packs.length > 1}
          onBack={() => setEditingId(null)}
          onRename={(name) => updateRoutine.mutate({ id: editingPack.id, input: { name } })}
          onSetSchedule={(days) => setSchedule.mutate({ routineId: editingPack.id, days })}
          onArchive={() => {
            archiveRoutine.mutate(editingPack.id)
            setEditingId(null)
          }}
          onAddItem={(block, title, emoji) =>
            createItem.mutate({ routine_id: editingPack.id, title, emoji, block })
          }
          onRenameItem={(id, title) => updateItem.mutate({ id, input: { title } })}
          onArchiveItem={(id) => archiveItem.mutate(id)}
          onSetOverride={(startDate, endDate) =>
            setOverrideRange.mutate({ routineId: editingPack.id, startDate, endDate })
          }
          onClearOverride={() => clearOverride.mutate()}
        />
      ) : (
        <RoutineList
          packs={packs}
          activeOverrideRoutineId={activeOverride?.routine_id ?? null}
          onSelect={setEditingId}
          showCreate={showCreate}
          onShowCreate={() => setShowCreate(true)}
          onCancelCreate={() => setShowCreate(false)}
          onCreate={async (name, emoji, cloneFromId) => {
            const pack = await createRoutine.mutateAsync({ name, emoji })
            if (cloneFromId) {
              const source = (items ?? []).filter((i) => i.routine_id === cloneFromId)
              for (const item of source) {
                await createItem.mutateAsync({
                  routine_id: pack.id,
                  title: item.title,
                  emoji: item.emoji,
                  block: item.block,
                  estimated_minutes: item.estimated_minutes,
                })
              }
            }
            setShowCreate(false)
            setEditingId(pack.id)
          }}
        />
      )}
    </GlassModal>
  )
}

function Badge({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        'text-[11px] font-semibold px-2 py-0.5 rounded-full',
        accent
          ? 'bg-accent-blue/15 text-accent-blue'
          : 'bg-black/[0.06] dark:bg-white/[0.08] text-black/50 dark:text-white/50',
      )}
    >
      {children}
    </span>
  )
}

function RoutineList({
  packs,
  activeOverrideRoutineId,
  onSelect,
  showCreate,
  onShowCreate,
  onCancelCreate,
  onCreate,
}: {
  packs: CalendarRoutine[]
  activeOverrideRoutineId: string | null
  onSelect: (id: string) => void
  showCreate: boolean
  onShowCreate: () => void
  onCancelCreate: () => void
  onCreate: (name: string, emoji: string, cloneFromId: string | null) => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-black/50 dark:text-white/50 -mt-1 leading-relaxed">
        Keep more than one routine — a relaxed Weekend pack, a Holiday pack for time off — and Flonny
        switches between them automatically based on each pack's schedule. You can also temporarily
        pin any pack to a date range from its editor.
      </p>

      <div className="flex flex-col gap-2">
        {packs.length === 0 && (
          <div className="glass-panel rounded-2xl px-4 py-3 text-[13px] text-black/45 dark:text-white/45">
            No routines yet. Create one to get started.
          </div>
        )}
        {packs.map((pack) => {
          const scheduleLabel = scheduleBadgeLabel(pack.auto_apply_days)
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => onSelect(pack.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] transition-colors text-left"
            >
              <span className="text-lg leading-none shrink-0">{pack.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{pack.name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {scheduleLabel ? <Badge>{scheduleLabel}</Badge> : <Badge>Manual only</Badge>}
                  {activeOverrideRoutineId === pack.id && <Badge accent>Active today</Badge>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {showCreate ? (
        <CreatePackForm packs={packs} onCancel={onCancelCreate} onCreate={onCreate} />
      ) : (
        <Button type="button" variant="secondary" size="md" onClick={onShowCreate}>
          <Plus className="size-4" />
          New routine
        </Button>
      )}
    </div>
  )
}

function CreatePackForm({
  packs,
  onCancel,
  onCreate,
}: {
  packs: CalendarRoutine[]
  onCancel: () => void
  onCreate: (name: string, emoji: string, cloneFromId: string | null) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_ROUTINE_PACK_EMOJI)
  const [cloneFromId, setCloneFromId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onCreate(trimmed, emoji || DEFAULT_ROUTINE_PACK_EMOJI, cloneFromId || null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Routine icon"
          value={emoji}
          onChange={(e) => setEmoji(firstGrapheme(e.target.value) || DEFAULT_ROUTINE_PACK_EMOJI)}
          className="size-11 shrink-0 rounded-xl text-center text-lg outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
        />
        <div className="flex-1 min-w-0">
          <TextField
            placeholder="e.g. Holiday"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {packs.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">
            Start from (optional)
          </span>
          <select
            value={cloneFromId}
            onChange={(e) => setCloneFromId(e.target.value)}
            className="h-11 rounded-xl px-3 text-[14px] outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
          >
            <option value="">Start empty</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                Copy items from {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="md"
          className="flex-1"
          loading={saving}
          disabled={!name.trim()}
          onClick={() => void submit()}
        >
          Create
        </Button>
      </div>
    </div>
  )
}

function RoutineEditor({
  pack,
  items,
  activeOverride,
  selectedDateKey,
  selectedDateLabel,
  canArchive,
  onBack,
  onRename,
  onSetSchedule,
  onArchive,
  onAddItem,
  onRenameItem,
  onArchiveItem,
  onSetOverride,
  onClearOverride,
}: {
  pack: CalendarRoutine
  items: CalendarRoutineItem[]
  /** The override covering `selectedDateKey`, only passed when it targets this pack. */
  activeOverride: CalendarRoutineOverride | null
  selectedDateKey: string
  selectedDateLabel: string
  canArchive: boolean
  onBack: () => void
  onRename: (name: string) => void
  onSetSchedule: (days: number[]) => void
  onArchive: () => void
  onAddItem: (block: DayBlock, title: string, emoji: string) => void
  onRenameItem: (id: string, title: string) => void
  onArchiveItem: (id: string) => void
  onSetOverride: (startDate: string, endDate: string | null) => void
  onClearOverride: () => void
}) {
  const [name, setName] = useState(pack.name)

  useEffect(() => {
    setName(pack.name)
  }, [pack.id, pack.name])

  function commitName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== pack.name) onRename(trimmed)
    else setName(pack.name)
  }

  const grouped = useMemo(() => {
    const groups: Record<DayBlock, CalendarRoutineItem[]> = { morning: [], afternoon: [], evening: [] }
    for (const item of items) groups[item.block].push(item)
    for (const block of BLOCKS) groups[block].sort((a, b) => a.position - b.position)
    return groups
  }, [items])

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[13px] font-medium text-black/50 dark:text-white/50 -mt-1 -ml-1 px-1 py-1 hover:text-black dark:hover:text-white transition-colors self-start"
      >
        <ChevronLeft className="size-4" />
        All routines
      </button>

      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none shrink-0">{pack.emoji}</span>
        <input
          type="text"
          aria-label="Routine name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitName()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="flex-1 min-w-0 h-11 rounded-xl px-3 text-[17px] font-semibold outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
        />
      </div>

      <ScheduleSection days={pack.auto_apply_days} onSetSchedule={onSetSchedule} />

      <OverrideForm
        activeOverride={activeOverride}
        selectedDateKey={selectedDateKey}
        selectedDateLabel={selectedDateLabel}
        onSetOverride={onSetOverride}
        onClearOverride={onClearOverride}
      />

      <div className="flex flex-col gap-4">
        {BLOCKS.map((block) => (
          <EditableBlockSection
            key={block}
            block={block}
            items={grouped[block]}
            onAddItem={(title, emoji) => onAddItem(block, title, emoji)}
            onRenameItem={onRenameItem}
            onArchiveItem={onArchiveItem}
          />
        ))}
      </div>

      {canArchive && (
        <Button type="button" variant="danger" size="md" onClick={onArchive}>
          <Trash2 className="size-4" />
          Delete this routine
        </Button>
      )}
    </div>
  )
}

function ScheduleSection({
  days,
  onSetSchedule,
}: {
  days: number[] | null
  onSetSchedule: (days: number[]) => void
}) {
  const preset = schedulePresetFor(days)
  const activeDays = days ?? []

  function toggleDay(day: number) {
    const next = new Set(activeDays)
    if (next.has(day)) next.delete(day)
    else next.add(day)
    onSetSchedule(Array.from(next).sort((a, b) => a - b))
  }

  return (
    <div className="flex flex-col gap-3 glass-panel rounded-2xl p-4">
      <div>
        <h3 className="text-[13px] font-semibold text-black/60 dark:text-white/60">Schedule</h3>
        <p className="text-[12px] text-black/45 dark:text-white/45 mt-0.5 leading-relaxed">
          Applies automatically on the days below, unless overridden for specific dates further down.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SCHEDULE_PRESET_CHIPS.map(({ key, label, days: presetDays }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSetSchedule(presetDays)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors',
              preset === key
                ? 'bg-accent-blue text-white'
                : 'bg-black/[0.05] dark:bg-white/[0.08] text-black/60 dark:text-white/60 hover:bg-black/[0.09] dark:hover:bg-white/[0.13]',
            )}
          >
            {label}
          </button>
        ))}
        <span
          className={cn(
            'px-3 py-1.5 rounded-full text-[13px] font-medium',
            preset === 'custom'
              ? 'bg-accent-blue text-white'
              : 'bg-black/[0.05] dark:bg-white/[0.08] text-black/35 dark:text-white/35',
          )}
        >
          Custom
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {SCHEDULE_DAY_ORDER.map((day, i) => {
          const active = activeDays.includes(day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              aria-pressed={active}
              aria-label={FULL_WEEKDAY_NAMES[day]}
              className={cn(
                'size-9 rounded-full text-[13px] font-semibold transition-colors',
                active
                  ? 'bg-accent-blue text-white'
                  : 'bg-black/[0.05] dark:bg-white/[0.08] text-black/50 dark:text-white/50 hover:bg-black/[0.09] dark:hover:bg-white/[0.13]',
              )}
            >
              {WEEKDAY_LABELS[i]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OverrideForm({
  activeOverride,
  selectedDateKey,
  selectedDateLabel,
  onSetOverride,
  onClearOverride,
}: {
  activeOverride: CalendarRoutineOverride | null
  selectedDateKey: string
  selectedDateLabel: string
  onSetOverride: (startDate: string, endDate: string | null) => void
  onClearOverride: () => void
}) {
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [customDate, setCustomDate] = useState('')

  useEffect(() => {
    setShowCustomDate(false)
    setCustomDate('')
  }, [selectedDateKey])

  if (activeOverride) {
    return (
      <div className="flex flex-col gap-2 glass-panel rounded-2xl p-4">
        <div>
          <h3 className="text-[13px] font-semibold text-black/60 dark:text-white/60">Temporary override</h3>
          <p className="text-[13px] text-black/50 dark:text-white/50 mt-0.5">
            {formatOverrideRange(activeOverride)}
          </p>
        </div>
        <Button type="button" variant="secondary" size="md" onClick={onClearOverride}>
          Reset to default
        </Button>
      </div>
    )
  }

  const base = fromDateKey(selectedDateKey)
  const quickOptions: { label: string; apply: () => void }[] = [
    { label: `Just ${selectedDateLabel}`, apply: () => onSetOverride(selectedDateKey, selectedDateKey) },
    { label: 'Next 7 days', apply: () => onSetOverride(selectedDateKey, toDateKey(addDays(base, 6))) },
    { label: 'Next 14 days', apply: () => onSetOverride(selectedDateKey, toDateKey(addDays(base, 13))) },
    {
      label: 'This month',
      apply: () => onSetOverride(toDateKey(startOfMonth(base)), toDateKey(endOfMonth(base))),
    },
    { label: 'Indefinitely', apply: () => onSetOverride(selectedDateKey, null) },
  ]

  return (
    <div className="flex flex-col gap-3 glass-panel rounded-2xl p-4">
      <div>
        <h3 className="text-[13px] font-semibold text-black/60 dark:text-white/60">Temporarily switch to this routine</h3>
        <p className="text-[12px] text-black/45 dark:text-white/45 mt-0.5 leading-relaxed">
          Pins this pack for a stretch of days — handy for a holiday week — without changing its
          regular schedule above.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {quickOptions.map((option) => (
          <Button key={option.label} type="button" variant="glass" size="sm" onClick={option.apply}>
            {option.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="glass"
          size="sm"
          className={cn(showCustomDate && 'ring-2 ring-accent-blue/40')}
          onClick={() => setShowCustomDate((v) => !v)}
        >
          Until a date…
        </Button>
      </div>
      {showCustomDate && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customDate}
            min={selectedDateKey}
            onChange={(e) => setCustomDate(e.target.value)}
            className="flex-1 min-w-0 h-11 rounded-xl px-3 text-[14px] outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/15"
          />
          <Button
            type="button"
            size="md"
            disabled={!customDate}
            onClick={() => onSetOverride(selectedDateKey, customDate)}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}

function EditableBlockSection({
  block,
  items,
  onAddItem,
  onRenameItem,
  onArchiveItem,
}: {
  block: DayBlock
  items: CalendarRoutineItem[]
  onAddItem: (title: string, emoji: string) => void
  onRenameItem: (id: string, title: string) => void
  onArchiveItem: (id: string) => void
}) {
  const Icon = ROUTINE_ICONS[block]

  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="size-3.5 text-black/40 dark:text-white/40" />
        <h3 className="text-[12px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide">
          {ROUTINE_LABELS[block]}
        </h3>
      </div>
      <div className="glass-panel rounded-2xl overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-black/40 dark:text-white/40">Nothing added yet.</p>
        ) : (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {items.map((item) => (
              <EditableItemRow
                key={item.id}
                item={item}
                onRename={(title) => onRenameItem(item.id, title)}
                onArchive={() => onArchiveItem(item.id)}
              />
            ))}
          </div>
        )}
        <AddItemRow label={`Add to ${ROUTINE_LABELS[block].toLowerCase()}`} onAdd={onAddItem} />
      </div>
    </section>
  )
}

function EditableItemRow({
  item,
  onRename,
  onArchive,
}: {
  item: CalendarRoutineItem
  onRename: (title: string) => void
  onArchive: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)

  function commit() {
    const trimmed = title.trim()
    if (trimmed && trimmed !== item.title) onRename(trimmed)
    else setTitle(item.title)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="text-base leading-none shrink-0">{item.emoji}</span>
      {editing ? (
        <input
          autoFocus
          type="text"
          aria-label="Routine item name"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              setTitle(item.title)
              setEditing(false)
            }
          }}
          className="flex-1 min-w-0 h-9 rounded-lg px-2 text-[14px] outline-none bg-black/[0.04] dark:bg-white/[0.06] border border-accent-blue/40 focus:ring-4 focus:ring-accent-blue/15"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-left text-[14px] font-medium truncate"
        >
          {item.title}
        </button>
      )}
      {item.estimated_minutes != null && !editing && (
        <span className="text-[11px] font-medium text-black/40 dark:text-white/40 shrink-0">
          ~{item.estimated_minutes}m
        </span>
      )}
      <button
        type="button"
        onClick={onArchive}
        aria-label={`Remove ${item.title}`}
        className="size-8 shrink-0 rounded-lg flex items-center justify-center text-black/35 dark:text-white/35 hover:bg-accent-red/10 hover:text-accent-red transition-colors"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

function AddItemRow({ label, onAdd }: { label: string; onAdd: (title: string, emoji: string) => void }) {
  const [open, setOpen] = useState(false)
  const [emoji, setEmoji] = useState(DEFAULT_ITEM_EMOJI)
  const [title, setTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  function openForm() {
    setOpen(true)
    setEmoji(DEFAULT_ITEM_EMOJI)
    setTitle('')
    window.setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  function closeForm() {
    setOpen(false)
    setEmoji(DEFAULT_ITEM_EMOJI)
    setTitle('')
  }

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd(trimmed, emoji || DEFAULT_ITEM_EMOJI)
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
        {label}
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
        onChange={(e) => setEmoji(firstGrapheme(e.target.value) || DEFAULT_ITEM_EMOJI)}
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
