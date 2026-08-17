import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import {
  useCalendarRoutineItems,
  useCalendarRoutines,
  useCreateCalendarRoutine,
  useCreateCalendarRoutineItem,
  useSetCalendarRoutineSchedule,
} from '@/hooks/useCalendarRoutines'
import {
  EVERY_DAY_SCHEDULE,
  hasWeekendSchedule,
  isWeekendDate,
  weekdaySourceRoutine,
  WEEKEND_SCHEDULE,
} from '@/lib/calendarRoutinePacks'
import {
  dismissWeekendRoutinePrompt,
  wasWeekendRoutinePromptDismissed,
} from '@/lib/weekendRoutinePrompt'

/**
 * When Saturday/Sunday arrives and no pack auto-applies on weekends, ask whether
 * to keep using the weekday routine or spin up a dedicated Weekend pack.
 */
export function WeekendRoutinePrompt() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: routines, isLoading: packsLoading } = useCalendarRoutines()
  const { data: items } = useCalendarRoutineItems()
  const createRoutine = useCreateCalendarRoutine()
  const createItem = useCreateCalendarRoutineItem()
  const setSchedule = useSetCalendarRoutineSchedule()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'same' | 'custom' | null>(null)

  const source = weekdaySourceRoutine(routines ?? [])

  useEffect(() => {
    if (!user || packsLoading) return
    if (!isWeekendDate(new Date())) return
    if (!routines?.length || !source) return
    if (hasWeekendSchedule(routines)) return
    if (wasWeekendRoutinePromptDismissed(user.id)) return
    setOpen(true)
  }, [user, packsLoading, routines, source])

  function closeAndRemember() {
    if (user) dismissWeekendRoutinePrompt(user.id)
    setOpen(false)
  }

  async function useSame() {
    if (!source) return
    setBusy('same')
    try {
      const existing = source.auto_apply_days ?? []
      const merged = existing.length
        ? Array.from(new Set([...existing, ...WEEKEND_SCHEDULE])).sort((a, b) => a - b)
        : EVERY_DAY_SCHEDULE
      await setSchedule.mutateAsync({ routineId: source.id, days: merged })
      closeAndRemember()
    } finally {
      setBusy(null)
    }
  }

  async function createWeekend() {
    if (!source) return
    setBusy('custom')
    try {
      const pack = await createRoutine.mutateAsync({
        name: 'Weekend',
        emoji: '🌿',
        auto_apply_days: WEEKEND_SCHEDULE,
      })
      const sourceItems = (items ?? []).filter((i) => i.routine_id === source.id)
      for (const item of sourceItems) {
        await createItem.mutateAsync({
          routine_id: pack.id,
          title: item.title,
          emoji: item.emoji,
          block: item.block,
          estimated_minutes: item.estimated_minutes,
        })
      }
      closeAndRemember()
      navigate(`/calendar?editRoutine=${pack.id}`, { replace: false })
    } finally {
      setBusy(null)
    }
  }

  return (
    <GlassModal open={open} onClose={closeAndRemember} title="It's the weekend">
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-black/60 dark:text-white/60 leading-relaxed">
          You don't have a weekend routine yet. Keep using{' '}
          <span className="font-medium text-black dark:text-white">
            {source?.emoji} {source?.name ?? 'your weekday routine'}
          </span>{' '}
          on Saturdays and Sundays, or make a custom weekend pack you can keep lighter.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="md"
            loading={busy === 'same'}
            disabled={busy !== null}
            onClick={() => void useSame()}
          >
            Use the same routine
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            loading={busy === 'custom'}
            disabled={busy !== null}
            onClick={() => void createWeekend()}
          >
            Create a weekend routine
          </Button>
        </div>
      </div>
    </GlassModal>
  )
}
