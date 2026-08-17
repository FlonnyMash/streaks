import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { EMOJI_OPTIONS } from '@/lib/accentColors'
import type { AccentColor, FrequencyType } from '@/lib/types'
import { WEEKDAY_LABELS, weekdayIndexToJsDay } from '@/lib/streakLogic'
import { useCreateStreak } from '@/hooks/useStreaks'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string; hint: string }[] = [
  { value: 'daily', label: 'Daily', hint: 'Every single day' },
  { value: 'weekdays', label: 'Specific days', hint: 'Pick weekdays' },
  { value: 'times_per_week', label: 'X per week', hint: 'Any days, weekly goal' },
]

interface CreateStreakGuideProps {
  initialName: string
  initialEmoji: string
  initialColor: AccentColor
  isReplay: boolean
  onDone: (created: boolean) => void
}

/** Short, guided streak-creation form shown during onboarding — a trimmed-down CreateStreakModal. */
export function CreateStreakGuide({ initialName, initialEmoji, initialColor, isReplay, onDone }: CreateStreakGuideProps) {
  const [name, setName] = useState(initialName)
  const [emoji, setEmoji] = useState(initialEmoji)
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [weekdayIndices, setWeekdayIndices] = useState<number[]>([0, 2, 4])
  const [targetCount, setTargetCount] = useState(3)
  const [error, setError] = useState<string | null>(null)
  const createStreak = useCreateStreak()

  function toggleWeekday(index: number) {
    setWeekdayIndices((indices) =>
      indices.includes(index) ? indices.filter((i) => i !== index) : [...indices, index].sort(),
    )
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Give your streak a name.')
      return
    }
    if (frequencyType === 'weekdays' && weekdayIndices.length === 0) {
      setError('Pick at least one day.')
      return
    }
    setError(null)

    if (isReplay) {
      onDone(false)
      return
    }

    try {
      await createStreak.mutateAsync({
        name: name.trim(),
        emoji,
        color: initialColor,
        frequency_type: frequencyType,
        target_weekdays: frequencyType === 'weekdays' ? weekdayIndices.map(weekdayIndexToJsDay) : null,
        target_count: frequencyType === 'times_per_week' ? targetCount : null,
        track_time: false,
        time_goal_minutes: null,
        time_goal_period: null,
        notify_enabled: false,
        notify_time: null,
      })
      onDone(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your streak.'))
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Set up your streak</h2>
        <p className="text-black/50 dark:text-white/50 text-[14px] mt-1">
          Tweak the name and pick how often you'll do it.
        </p>
      </div>

      <div className="w-full flex flex-col gap-4 text-left">
        <TextField
          label="Name"
          placeholder="e.g. Going to the gym"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />

        <EmojiPicker value={emoji} options={EMOJI_OPTIONS} onChange={setEmoji} />

        <div>
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">How often?</span>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequencyType(opt.value)}
                className={cn(
                  'rounded-2xl px-2 py-2.5 text-center transition-all',
                  frequencyType === opt.value
                    ? 'bg-accent-blue/12 ring-2 ring-accent-blue'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                )}
              >
                <div className="text-[13px] font-semibold">{opt.label}</div>
                <div className="text-[11px] text-black/45 dark:text-white/45 mt-0.5">{opt.hint}</div>
              </button>
            ))}
          </div>

          {frequencyType === 'weekdays' && (
            <div className="flex gap-1.5 mt-3">
              {WEEKDAY_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleWeekday(index)}
                  className={cn(
                    'flex-1 h-10 rounded-xl text-[12px] font-semibold transition-all',
                    weekdayIndices.includes(index)
                      ? 'bg-accent-blue text-white'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50',
                  )}
                >
                  {label[0]}
                </button>
              ))}
            </div>
          )}

          {frequencyType === 'times_per_week' && (
            <div className="flex items-center justify-center gap-4 mt-3 glass-panel rounded-2xl py-3">
              <button
                type="button"
                onClick={() => setTargetCount((c) => Math.max(1, c - 1))}
                className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
              >
                <Minus className="size-4" />
              </button>
              <span className="text-xl font-bold w-10 text-center tabular-nums">{targetCount}</span>
              <button
                type="button"
                onClick={() => setTargetCount((c) => Math.min(7, c + 1))}
                className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
              >
                <Plus className="size-4" />
              </button>
              <span className="text-[13px] text-black/50 dark:text-white/50">times / week</span>
            </div>
          )}
        </div>

        {error && <p className="text-[13px] text-accent-red px-0.5">{error}</p>}
      </div>

      <Button size="lg" className="w-full" loading={createStreak.isPending} onClick={() => void handleCreate()}>
        Create streak
      </Button>
    </div>
  )
}
