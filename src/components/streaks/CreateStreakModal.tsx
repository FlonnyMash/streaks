import { useEffect, useState } from 'react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Switch } from '@/components/ui/Switch'
import { ACCENT_COLOR_MAP, EMOJI_OPTIONS } from '@/lib/accentColors'
import { ACCENT_COLORS, type AccentColor, type FrequencyType, type Streak, type TimeGoalPeriod } from '@/lib/types'
import { WEEKDAY_LABELS, jsDayToWeekdayIndex, weekdayIndexToJsDay } from '@/lib/streakLogic'
import { useCreateStreak, useUpdateStreak } from '@/hooks/useStreaks'
import { cn, formatMinutes } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import { Minus, Plus } from 'lucide-react'

const TIME_GOAL_PERIOD_OPTIONS: { value: TimeGoalPeriod; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
]

const MINUTE_PRESETS = [15, 30, 60, 120]
const MINUTES_STEP = 5
const MIN_GOAL_MINUTES = 5
const MAX_GOAL_MINUTES = 24 * 60

interface CreateStreakModalProps {
  open: boolean
  onClose: () => void
  editingStreak?: Streak
}

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string; hint: string }[] = [
  { value: 'daily', label: 'Daily', hint: 'Every single day' },
  { value: 'weekdays', label: 'Specific days', hint: 'Pick weekdays' },
  { value: 'times_per_week', label: 'X per week', hint: 'Any days, weekly goal' },
]

function defaultState() {
  return {
    name: '',
    emoji: EMOJI_OPTIONS[0],
    color: 'blue' as AccentColor,
    frequency_type: 'daily' as FrequencyType,
    weekdayIndices: [0, 2, 4] as number[],
    targetCount: 3,
    trackTime: false,
    hasTimeGoal: false,
    timeGoalPeriod: 'day' as TimeGoalPeriod,
    timeGoalMinutes: 30,
  }
}

export function CreateStreakModal({ open, onClose, editingStreak }: CreateStreakModalProps) {
  const [state, setState] = useState(defaultState())
  const [error, setError] = useState<string | null>(null)
  const createStreak = useCreateStreak()
  const updateStreak = useUpdateStreak()
  const isEditing = Boolean(editingStreak)
  const pending = createStreak.isPending || updateStreak.isPending
  const hasGoal = state.trackTime && state.hasTimeGoal

  useEffect(() => {
    if (!open) return
    if (editingStreak) {
      setState({
        name: editingStreak.name,
        emoji: editingStreak.emoji,
        color: editingStreak.color,
        frequency_type: editingStreak.frequency_type,
        weekdayIndices: (editingStreak.target_weekdays ?? []).map(jsDayToWeekdayIndex),
        targetCount: editingStreak.target_count ?? 3,
        trackTime: editingStreak.track_time,
        hasTimeGoal: editingStreak.time_goal_period != null,
        timeGoalPeriod: editingStreak.time_goal_period ?? 'day',
        timeGoalMinutes: editingStreak.time_goal_minutes ?? 30,
      })
    } else {
      setState(defaultState())
    }
    setError(null)
  }, [open, editingStreak])

  function toggleWeekday(index: number) {
    setState((s) => ({
      ...s,
      weekdayIndices: s.weekdayIndices.includes(index)
        ? s.weekdayIndices.filter((i) => i !== index)
        : [...s.weekdayIndices, index].sort(),
    }))
  }

  async function handleSubmit() {
    if (!state.name.trim()) {
      setError('Give your streak a name.')
      return
    }
    if (!hasGoal && state.frequency_type === 'weekdays' && state.weekdayIndices.length === 0) {
      setError('Pick at least one day.')
      return
    }
    setError(null)

    const input = {
      name: state.name.trim(),
      emoji: state.emoji,
      color: state.color,
      // A time goal replaces the day-based schedule as the completion criterion, so force
      // 'daily' (unrestricted) scheduling underneath it instead of stacking two gates.
      frequency_type: hasGoal ? ('daily' as FrequencyType) : state.frequency_type,
      target_weekdays:
        !hasGoal && state.frequency_type === 'weekdays' ? state.weekdayIndices.map(weekdayIndexToJsDay) : null,
      target_count: !hasGoal && state.frequency_type === 'times_per_week' ? state.targetCount : null,
      track_time: state.trackTime,
      time_goal_minutes: hasGoal ? state.timeGoalMinutes : null,
      time_goal_period: hasGoal ? state.timeGoalPeriod : null,
    }

    try {
      if (editingStreak) {
        await updateStreak.mutateAsync({ id: editingStreak.id, input })
      } else {
        await createStreak.mutateAsync(input)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save streak.'))
    }
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEditing ? 'Edit Streak' : 'New Streak'}>
      <div className="flex flex-col gap-5">
        <TextField
          label="Name"
          placeholder="e.g. Morning workout"
          value={state.name}
          maxLength={40}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          autoFocus
        />

        <div>
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Icon</span>
          <div className="grid grid-cols-8 gap-1.5 mt-1.5">
            {EMOJI_OPTIONS.map((emoji) => (
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

        {!hasGoal && (
          <div>
            <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">Frequency</span>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, frequency_type: opt.value }))}
                  className={cn(
                    'rounded-2xl px-2 py-2.5 text-center transition-all',
                    state.frequency_type === opt.value
                      ? 'bg-accent-blue/12 ring-2 ring-accent-blue'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                  )}
                >
                  <div className="text-[13px] font-semibold">{opt.label}</div>
                  <div className="text-[11px] text-black/45 dark:text-white/45 mt-0.5">{opt.hint}</div>
                </button>
              ))}
            </div>

            {state.frequency_type === 'weekdays' && (
              <div className="flex gap-1.5 mt-3">
                {WEEKDAY_LABELS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleWeekday(index)}
                    className={cn(
                      'flex-1 h-10 rounded-xl text-[12px] font-semibold transition-all',
                      state.weekdayIndices.includes(index)
                        ? 'bg-accent-blue text-white'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50',
                    )}
                  >
                    {label[0]}
                  </button>
                ))}
              </div>
            )}

            {state.frequency_type === 'times_per_week' && (
              <div className="flex items-center justify-center gap-4 mt-3 glass-panel rounded-2xl py-3">
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, targetCount: Math.max(1, s.targetCount - 1) }))}
                  className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
                >
                  <Minus className="size-4" />
                </button>
                <span className="text-xl font-bold w-10 text-center tabular-nums">{state.targetCount}</span>
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, targetCount: Math.min(7, s.targetCount + 1) }))}
                  className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
                >
                  <Plus className="size-4" />
                </button>
                <span className="text-[13px] text-black/50 dark:text-white/50">times / week</span>
              </div>
            )}
          </div>
        )}

        <div className="glass-panel rounded-2xl p-4">
          <Switch
            checked={state.trackTime}
            onChange={(checked) => setState((s) => ({ ...s, trackTime: checked }))}
            label="Track time"
            description="Log how many minutes you spend each day"
          />

          {state.trackTime && (
            <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-3">
              <Switch
                checked={state.hasTimeGoal}
                onChange={(checked) => setState((s) => ({ ...s, hasTimeGoal: checked }))}
                label="Require a time goal"
                description="Meeting the goal is what counts as done — replaces the frequency schedule"
              />

              {state.hasTimeGoal && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_GOAL_PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setState((s) => ({ ...s, timeGoalPeriod: opt.value }))}
                        className={cn(
                          'h-10 rounded-xl text-[13px] font-semibold transition-all',
                          state.timeGoalPeriod === opt.value
                            ? 'bg-accent-blue text-white'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/60 dark:text-white/60 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-4 glass-panel rounded-2xl py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          timeGoalMinutes: Math.max(MIN_GOAL_MINUTES, s.timeGoalMinutes - MINUTES_STEP),
                        }))
                      }
                      className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="text-xl font-bold w-20 text-center tabular-nums">
                      {formatMinutes(state.timeGoalMinutes)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          timeGoalMinutes: Math.min(MAX_GOAL_MINUTES, s.timeGoalMinutes + MINUTES_STEP),
                        }))
                      }
                      className="size-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 active:scale-90 transition-all"
                    >
                      <Plus className="size-4" />
                    </button>
                    <span className="text-[13px] text-black/50 dark:text-white/50">
                      per {state.timeGoalPeriod}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {MINUTE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setState((s) => ({ ...s, timeGoalMinutes: preset }))}
                        className={cn(
                          'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                          state.timeGoalMinutes === preset
                            ? 'bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                        )}
                      >
                        {formatMinutes(preset)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-[13px] text-accent-red text-center -mb-2">{error}</p>}

        <Button onClick={handleSubmit} loading={pending} size="lg" className="w-full">
          {isEditing ? 'Save Changes' : 'Create Streak'}
        </Button>
      </div>
    </GlassModal>
  )
}
