import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { cn, formatMinutes, fromDateKey } from '@/lib/utils'
import type { TimesheetEntry } from '@/lib/types'

const MINUTES_STEP = 15
const MINUTE_PRESETS = [15, 30, 60, 120]

interface DayEntriesModalProps {
  open: boolean
  onClose: () => void
  dateKey: string | null
  entries: TimesheetEntry[]
  accentHex: string
  isSaving: boolean
  onAdd: (input: { minutes: number; topic: string | null; note: string | null }) => void
  onDelete: (id: string) => void
}

function defaultDraft() {
  return { minutes: 30, topic: '', note: '' }
}

export function DayEntriesModal({ open, onClose, dateKey, entries, accentHex, isSaving, onAdd, onDelete }: DayEntriesModalProps) {
  const [draft, setDraft] = useState(defaultDraft())

  useEffect(() => {
    if (open) setDraft(defaultDraft())
  }, [open, dateKey])

  if (!dateKey) return null

  const total = entries.reduce((sum, e) => sum + e.minutes, 0)

  function handleAdd() {
    if (draft.minutes <= 0) return
    onAdd({
      minutes: draft.minutes,
      topic: draft.topic.trim() ? draft.topic.trim() : null,
      note: draft.note.trim() ? draft.note.trim() : null,
    })
    setDraft(defaultDraft())
  }

  return (
    <GlassModal open={open} onClose={onClose} title={format(fromDateKey(dateKey), 'EEEE, MMM d')}>
      <div className="flex flex-col gap-5">
        {total > 0 && (
          <p className="text-center text-[13px] text-black/50 dark:text-white/50 -mt-1">
            <span className="font-semibold" style={{ color: accentHex }}>
              {formatMinutes(total)}
            </span>{' '}
            logged this day
          </p>
        )}

        {entries.length > 0 && (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-3"
                >
                  <div
                    className="shrink-0 size-9 rounded-xl flex items-center justify-center text-[12px] font-bold tabular-nums text-white"
                    style={{ backgroundColor: accentHex }}
                  >
                    {formatMinutes(entry.minutes)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium truncate">{entry.topic || 'Time logged'}</p>
                    {entry.note && <p className="text-[12px] text-black/45 dark:text-white/45 truncate">{entry.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    aria-label="Delete entry"
                    className="shrink-0 size-8 rounded-full flex items-center justify-center text-black/30 dark:text-white/30 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5 pt-3">Log time</span>

          <div className="flex items-center justify-center gap-4 glass-panel rounded-2xl py-3">
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, minutes: Math.max(MINUTES_STEP, d.minutes - MINUTES_STEP) }))}
              className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
            >
              <Minus className="size-4" />
            </button>
            <span className="text-xl font-bold w-20 text-center tabular-nums">{formatMinutes(draft.minutes)}</span>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, minutes: d.minutes + MINUTES_STEP }))}
              className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {MINUTE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, minutes: preset }))}
                className={cn(
                  'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                  draft.minutes === preset
                    ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                )}
              >
                {formatMinutes(preset)}
              </button>
            ))}
          </div>

          <input
            value={draft.topic}
            onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value.slice(0, 80) }))}
            placeholder="Topic (optional) — e.g. Client call"
            className={cn(
              'h-11 rounded-2xl px-4 text-[15px] outline-none transition-all',
              'bg-black/[0.04] dark:bg-white/[0.06]',
              'border border-black/[0.06] dark:border-white/[0.08]',
              'placeholder:text-black/30 dark:placeholder:text-white/30',
              'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
            )}
          />

          <input
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value.slice(0, 500) }))}
            placeholder="Note (optional)"
            className={cn(
              'h-11 rounded-2xl px-4 text-[15px] outline-none transition-all',
              'bg-black/[0.04] dark:bg-white/[0.06]',
              'border border-black/[0.06] dark:border-white/[0.08]',
              'placeholder:text-black/30 dark:placeholder:text-white/30',
              'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
            )}
          />

          <Button onClick={handleAdd} loading={isSaving} size="lg" className="w-full">
            <Plus className="size-4" />
            Add time block
          </Button>
        </div>
      </div>
    </GlassModal>
  )
}
