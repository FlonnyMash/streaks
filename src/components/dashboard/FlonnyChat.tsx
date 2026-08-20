import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { useCreateTodo } from '@/hooks/useTodos'
import { parseQuickCapture, type QuickCaptureResult } from '@/lib/quickCaptureParser'
import { ROUTINE_ICONS, ROUTINE_LABELS } from '@/lib/routineLogic'
import { hapticTick } from '@/lib/haptics'
import { getErrorMessage } from '@/lib/errors'
import { cn, formatMinutes, toDateKey } from '@/lib/utils'
import { CELEBRATE_MS, SLEEP_AFTER_MS, type FlonnyMood } from '@/lib/flonny/behaviors'
import { FlonnyLive2D } from '@/components/flonny/FlonnyLive2D'

interface ChatMessage {
  id: string
  role: 'bot' | 'user'
  text: string
  chips?: QuickCaptureResult
}

const BOT_REPLIES = [
  "Got it — added that to your list.",
  "On it, popped that onto your todos.",
  "Done! That's on your list now.",
  "Noted — I've added it for you.",
]

function randomReply(): string {
  return BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)]
}

export function FlonnyChat() {
  const createTodo = useCreateTodo()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'greeting', role: 'bot', text: 'Hey, how are you? 👋' },
  ])
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [celebrateUntil, setCelebrateUntil] = useState<number | null>(null)
  const [isSleeping, setIsSleeping] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setIsSleeping((sleeping) => (sleeping ? false : sleeping))
  }, [])

  // Global wake signal: any pointer/keyboard activity on the page rouses a dozing Flonny.
  useEffect(() => {
    window.addEventListener('pointermove', bumpActivity)
    window.addEventListener('pointerdown', bumpActivity)
    window.addEventListener('keydown', bumpActivity)
    return () => {
      window.removeEventListener('pointermove', bumpActivity)
      window.removeEventListener('pointerdown', bumpActivity)
      window.removeEventListener('keydown', bumpActivity)
    }
  }, [bumpActivity])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isSleeping && Date.now() - lastActivityRef.current > SLEEP_AFTER_MS) {
        setIsSleeping(true)
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isSleeping])

  useEffect(() => {
    if (celebrateUntil == null) return
    const timeout = window.setTimeout(() => setCelebrateUntil(null), Math.max(0, celebrateUntil - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [celebrateUntil])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const thinking = focused || text.trim().length > 0
  const mood: FlonnyMood = celebrateUntil != null ? 'celebrating' : thinking ? 'thinking' : isSleeping ? 'sleeping' : 'idle'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const raw = text.trim()
    if (!raw || createTodo.isPending) return

    bumpActivity()
    const parsed = parseQuickCapture(raw)
    const userMessageId = crypto.randomUUID()
    setMessages((current) => [...current, { id: userMessageId, role: 'user', text: raw }])
    setText('')
    setError(null)

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
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'bot', text: randomReply(), chips: parsed },
      ])
      setCelebrateUntil(Date.now() + CELEBRATE_MS)
    } catch (err) {
      const message = getErrorMessage(err, 'Could not add that task. Please try again.')
      setText(raw)
      setError(message)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'bot', text: message }])
    }
  }

  return (
    <div className="glass-panel rounded-[28px] p-5 mb-6">
      <div className="flex gap-3 items-start pt-1">
        <motion.div
          className="w-36 h-40 shrink-0 overflow-visible"
          animate={{ y: [0, 2, 0, 4, 0], x: [0, 2, -2, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FlonnyLive2D mood={mood} />
        </motion.div>

        <div ref={scrollRef} className="flex-1 min-w-0 max-h-60 overflow-y-auto flex flex-col gap-1.5 pt-1 pr-0.5">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2 mt-4">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            bumpActivity()
          }}
          onFocus={() => {
            setFocused(true)
            bumpActivity()
          }}
          onBlur={() => setFocused(false)}
          placeholder="e.g. Walk the dog 15m evening"
          maxLength={200}
          className={cn(
            'flex-1 min-w-0 h-14 rounded-2xl px-4 text-[16px] outline-none transition-all',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'border border-black/[0.06] dark:border-white/[0.08]',
            'placeholder:text-black/30 dark:placeholder:text-white/30',
            'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
          )}
        />
        <button
          type="submit"
          disabled={!text.trim() || createTodo.isPending}
          aria-label="Send message"
          className="shrink-0 size-14 rounded-2xl bg-accent-blue text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </form>

      {error && (
        <p className="text-[13px] text-accent-red mt-2 px-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isBot = message.role === 'bot'
  const RoutineIcon = message.chips ? ROUTINE_ICONS[message.chips.routine] : null
  const showChips =
    message.chips && (message.chips.routine !== 'anytime' || message.chips.estimated_minutes || message.chips.due_date)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col', isBot ? 'items-start' : 'items-end')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug',
          isBot
            ? 'bg-black/[0.05] dark:bg-white/[0.08] text-black/80 dark:text-white/80'
            : 'bg-accent-blue text-white',
        )}
      >
        {message.text}
      </div>

      <AnimatePresence>
        {showChips && message.chips && RoutineIcon && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-1.5 pt-1 overflow-hidden"
          >
            {message.chips.routine !== 'anytime' && (
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10.5px] font-medium bg-black/[0.06] dark:bg-white/[0.08]">
                <RoutineIcon className="size-2.5" />
                {ROUTINE_LABELS[message.chips.routine]}
              </span>
            )}
            {message.chips.estimated_minutes != null && (
              <span className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-medium bg-black/[0.06] dark:bg-white/[0.08]">
                ~{formatMinutes(message.chips.estimated_minutes)}
              </span>
            )}
            {message.chips.due_date && (
              <span className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-medium bg-black/[0.06] dark:bg-white/[0.08]">
                {message.chips.due_date === toDateKey(new Date()) ? 'Today' : message.chips.due_date}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
