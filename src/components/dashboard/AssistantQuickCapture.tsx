import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { useCreateTodo } from '@/hooks/useTodos'
import { parseQuickCapture, type QuickCaptureResult } from '@/lib/quickCaptureParser'
import { ROUTINE_ICONS, ROUTINE_LABELS } from '@/lib/routineLogic'
import { hapticTick } from '@/lib/haptics'
import { getErrorMessage } from '@/lib/errors'
import { cn, formatMinutes, toDateKey } from '@/lib/utils'

const CHIP_VISIBLE_MS = 3200

export function AssistantQuickCapture() {
  const createTodo = useCreateTodo()
  const [text, setText] = useState('')
  const [lastAdded, setLastAdded] = useState<QuickCaptureResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const raw = text.trim()
    if (!raw || createTodo.isPending) return

    const parsed = parseQuickCapture(raw)
    setText('')
    setError(null)
    setLastAdded(null)

    try {
      await createTodo.mutateAsync({
        title: parsed.title,
        notes: null,
        due_date: parsed.due_date,
        importance: 2,
        routine: parsed.routine,
        estimated_minutes: parsed.estimated_minutes,
      })
      hapticTick()
      setLastAdded(parsed)
      window.setTimeout(() => setLastAdded((current) => (current === parsed ? null : current)), CHIP_VISIBLE_MS)
    } catch (err) {
      setText(raw)
      setError(getErrorMessage(err, 'Could not add that task. Please try again.'))
    }
  }

  const showChips = lastAdded && (lastAdded.routine !== 'anytime' || lastAdded.estimated_minutes || lastAdded.due_date)
  const RoutineIcon = lastAdded ? ROUTINE_ICONS[lastAdded.routine] : null

  return (
    <div className="glass-panel rounded-[28px] p-4 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="size-9 rounded-full bg-accent-indigo/15 flex items-center justify-center shrink-0">
          <Sparkles className="size-4 text-accent-indigo" />
        </div>
        <p className="text-[14px] text-black/65 dark:text-white/65 leading-snug pt-1.5">
          What&apos;s on your mind? I can help you structure your day and achieve your goals.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Walk the dog 15m evening"
          maxLength={200}
          className={cn(
            'flex-1 min-w-0 h-12 rounded-2xl px-4 text-[15px] outline-none transition-all',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'border border-black/[0.06] dark:border-white/[0.08]',
            'placeholder:text-black/30 dark:placeholder:text-white/30',
            'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
          )}
        />
        <button
          type="submit"
          disabled={!text.trim() || createTodo.isPending}
          aria-label="Add task"
          className="shrink-0 size-12 rounded-2xl bg-accent-blue text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>

      {error && (
        <p className="text-[13px] text-accent-red mt-2 px-0.5" role="alert">
          {error}
        </p>
      )}

      <AnimatePresence>
        {showChips && lastAdded && RoutineIcon && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="flex flex-wrap items-center gap-1.5 pt-3 overflow-hidden"
          >
            <span className="text-[12px] text-black/45 dark:text-white/45">Added to</span>
            {lastAdded.routine !== 'anytime' && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-medium bg-black/[0.06] dark:bg-white/[0.08]">
                <RoutineIcon className="size-3" />
                {ROUTINE_LABELS[lastAdded.routine]}
              </span>
            )}
            {lastAdded.estimated_minutes != null && (
              <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium bg-black/[0.06] dark:bg-white/[0.08]">
                ~{formatMinutes(lastAdded.estimated_minutes)}
              </span>
            )}
            {lastAdded.due_date && (
              <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium bg-black/[0.06] dark:bg-white/[0.08]">
                {lastAdded.due_date === toDateKey(new Date()) ? 'Today' : lastAdded.due_date}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
