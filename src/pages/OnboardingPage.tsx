import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, PartyPopper, Sparkles, Sunrise, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GuestPageLayout } from '@/components/layout/GuestPageLayout'
import { Spinner } from '@/components/ui/Spinner'
import { RoutinePillGrid, type CustomRoutineOption } from '@/components/onboarding/RoutinePillGrid'
import { StreakExampleGrid, type StreakSelection } from '@/components/onboarding/StreakExampleGrid'
import { CreateStreakGuide } from '@/components/onboarding/CreateStreakGuide'
import { SampleTaskTrial } from '@/components/onboarding/SampleTaskTrial'
import { MilestoneUnlock } from '@/components/onboarding/MilestoneUnlock'
import { NotificationPrimer } from '@/components/onboarding/NotificationPrimer'
import { useAuth } from '@/hooks/useAuth'
import { useCompleteOnboardingTour } from '@/hooks/useProfile'
import { useCreateCalendarRoutine, useCreateCalendarRoutineItem } from '@/hooks/useCalendarRoutines'
import { supabase } from '@/lib/supabaseClient'
import { ONBOARDING_ROUTINES, findOnboardingRoutineOption } from '@/lib/onboardingRoutines'
import { ONBOARDING_STREAKS, findOnboardingStreakOption } from '@/lib/onboardingStreaks'
import type { AccentColor } from '@/lib/types'

type RoutinePickerBlock = 'morning' | 'afternoon' | 'evening'

const ROUTINE_BLOCK_ORDER: RoutinePickerBlock[] = ['morning', 'afternoon', 'evening']

interface RoutineSelection {
  block: RoutinePickerBlock
  label: string
  emoji: string
  estimated_minutes: number | null
}

type Step =
  | 'welcome'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'streak-pick'
  | 'streak-setup'
  | 'trial'
  | 'milestone'
  | 'notifications'
  | 'done'

const STEP_ORDER: Step[] = [
  'welcome',
  'morning',
  'afternoon',
  'evening',
  'streak-pick',
  'streak-setup',
  'trial',
  'milestone',
  'notifications',
  'done',
]

const TRIAL_STEP_INDEX = STEP_ORDER.indexOf('trial')
const STREAK_PICK_STEP_INDEX = STEP_ORDER.indexOf('streak-pick')
const STREAK_SETUP_STEP_INDEX = STEP_ORDER.indexOf('streak-setup')

const DEFAULT_TRIAL_TASK = { label: 'Take a deep breath', emoji: '🌿' }
const ONBOARDING_PACK_NAME = 'Weekdays'
const ONBOARDING_PACK_EMOJI = '📅'

function onboardingPackStorageKey(userId: string) {
  return `onboarding-weekdays-pack:${userId}`
}

interface OnboardingSeedProgress {
  packId: string
  itemKeys: string[]
}

function readSeedProgress(userId: string): OnboardingSeedProgress | null {
  const raw = sessionStorage.getItem(onboardingPackStorageKey(userId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as OnboardingSeedProgress
    if (typeof parsed?.packId === 'string') {
      return {
        packId: parsed.packId,
        itemKeys: Array.isArray(parsed.itemKeys) ? parsed.itemKeys.filter((k) => typeof k === 'string') : [],
      }
    }
  } catch {
    // First version stored a bare pack id.
  }
  return { packId: raw, itemKeys: [] }
}

function writeSeedProgress(userId: string, progress: OnboardingSeedProgress) {
  sessionStorage.setItem(onboardingPackStorageKey(userId), JSON.stringify(progress))
}

function emptySelection(): Record<RoutinePickerBlock, string[]> {
  return { morning: [], afternoon: [], evening: [] }
}

function emptyCustom(): Record<RoutinePickerBlock, CustomRoutineOption[]> {
  return { morning: [], afternoon: [], evening: [] }
}

export function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isReplay = searchParams.get('replay') === '1'
  const completeTour = useCompleteOnboardingTour()
  const createRoutine = useCreateCalendarRoutine()
  const createRoutineItem = useCreateCalendarRoutineItem()

  const [stepIndex, setStepIndex] = useState(0)
  const [selected, setSelected] = useState(emptySelection)
  const [customRoutines, setCustomRoutines] = useState(emptyCustom)
  const [streakSelection, setStreakSelection] = useState<StreakSelection>(null)
  const [streakCreated, setStreakCreated] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const createdPackIdRef = useRef<string | null>(null)
  const createdItemKeysRef = useRef(new Set<string>())
  const step = STEP_ORDER[stepIndex]

  const streakDraft = useMemo(() => {
    if (!streakSelection) return null
    if (streakSelection.kind === 'preset') {
      const option = findOnboardingStreakOption(streakSelection.id)
      if (!option) return null
      return { name: option.label, emoji: option.emoji, color: option.color }
    }
    return { name: streakSelection.label, emoji: streakSelection.emoji, color: 'blue' as AccentColor }
  }, [streakSelection])

  // Ordered by block (morning, afternoon, evening), presets before custom entries within each block.
  const selections = useMemo<RoutineSelection[]>(() => {
    const result: RoutineSelection[] = []
    for (const block of ROUTINE_BLOCK_ORDER) {
      for (const id of selected[block]) {
        const option = findOnboardingRoutineOption(id)
        if (option) {
          result.push({
            block,
            label: option.label,
            emoji: option.emoji,
            estimated_minutes: option.estimated_minutes,
          })
        }
      }
      for (const custom of customRoutines[block]) {
        result.push({ block, label: custom.label, emoji: custom.emoji, estimated_minutes: null })
      }
    }
    return result
  }, [selected, customRoutines])

  const trialTask = useMemo(() => {
    const first = selections[0]
    return first ? { label: first.label, emoji: first.emoji } : DEFAULT_TRIAL_TASK
  }, [selections])

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1))
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  function skipStreak() {
    setStreakSelection(null)
    setStepIndex(TRIAL_STEP_INDEX)
  }

  function continueToStreakSetup() {
    setStepIndex(STREAK_SETUP_STEP_INDEX)
  }

  function handleStreakDone(created: boolean) {
    if (created) setStreakCreated(true)
    setStepIndex(TRIAL_STEP_INDEX)
  }

  function toggleOption(block: RoutinePickerBlock, id: string) {
    setSelected((s) => ({
      ...s,
      [block]: s[block].includes(id) ? s[block].filter((x) => x !== id) : [...s[block], id],
    }))
  }

  function addCustomRoutine(block: RoutinePickerBlock, label: string, emoji: string) {
    setCustomRoutines((c) => ({
      ...c,
      [block]: [...c[block], { id: crypto.randomUUID(), label, emoji }],
    }))
  }

  function removeCustomRoutine(block: RoutinePickerBlock, id: string) {
    setCustomRoutines((c) => ({
      ...c,
      [block]: c[block].filter((option) => option.id !== id),
    }))
  }

  async function handleFinish() {
    if (!user || finishing) return
    setFinishing(true)
    try {
      // Replays are for revisiting the tour, not for re-seeding duplicate starter routines/packs.
      if (!isReplay) {
        const stored = readSeedProgress(user.id)
        let packId = createdPackIdRef.current ?? stored?.packId ?? null
        for (const key of stored?.itemKeys ?? []) createdItemKeysRef.current.add(key)

        if (!packId) {
          try {
            const { data: existing, error: existingError } = await supabase
              .from('calendar_routines')
              .select('id')
              .eq('name', ONBOARDING_PACK_NAME)
              .eq('archived', false)
              .limit(1)
              .maybeSingle()
            if (!existingError) packId = existing?.id ?? null
          } catch {
            // Offline or first-run: create the pack below.
          }
        }

        if (!packId) {
          const pack = await createRoutine.mutateAsync({
            name: ONBOARDING_PACK_NAME,
            emoji: ONBOARDING_PACK_EMOJI,
            auto_apply_days: [1, 2, 3, 4, 5],
          })
          packId = pack.id
        }

        createdPackIdRef.current = packId
        writeSeedProgress(user.id, { packId, itemKeys: [...createdItemKeysRef.current] })

        try {
          const { data: existingItems, error: itemsError } = await supabase
            .from('calendar_routine_items')
            .select('title, emoji, block')
            .eq('routine_id', packId)
            .eq('archived', false)
          if (!itemsError) {
            for (const item of existingItems ?? []) {
              createdItemKeysRef.current.add(`${item.block}:${item.title}:${item.emoji}`)
            }
          }
        } catch {
          // Offline: skip server lookup and rely on in-session keys.
        }

        for (const selection of selections) {
          const key = `${selection.block}:${selection.label}:${selection.emoji}`
          if (createdItemKeysRef.current.has(key)) continue
          await createRoutineItem.mutateAsync({
            routine_id: packId,
            title: selection.label,
            emoji: selection.emoji,
            block: selection.block,
            estimated_minutes: selection.estimated_minutes,
          })
          createdItemKeysRef.current.add(key)
          writeSeedProgress(user.id, { packId, itemKeys: [...createdItemKeysRef.current] })
        }
        await completeTour.mutateAsync()
        sessionStorage.removeItem(onboardingPackStorageKey(user.id))
      }
      navigate('/dashboard', { replace: true })
    } finally {
      setFinishing(false)
    }
  }

  if (!user) return <Spinner />

  return (
    <GuestPageLayout>
      <div className="w-full max-w-sm flex flex-col gap-6">
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-1.5">
            {STEP_ORDER.slice(0, -1).map((s, i) => (
              <span
                key={s}
                className={
                  i <= stepIndex
                    ? 'h-1.5 w-6 rounded-full bg-accent-blue transition-all'
                    : 'h-1.5 w-6 rounded-full bg-black/10 dark:bg-white/15 transition-all'
                }
              />
            ))}
          </div>
        )}

        <div className="glass-panel rounded-[28px] p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {step === 'welcome' && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="size-16 rounded-[22px] bg-gradient-to-br from-accent-blue to-accent-indigo flex items-center justify-center shadow-[0_12px_30px_-8px_rgba(10,132,255,0.5)]">
                    <Sparkles className="size-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Let's build your ideal day</h1>
                    <p className="text-black/50 dark:text-white/50 text-[15px] mt-2 leading-relaxed">
                      Pick a few things you already do each morning, afternoon, and evening. We'll
                      turn them into your first routine, with time-blocks and gentle reminders.
                    </p>
                  </div>
                </div>
              )}

              {(step === 'morning' || step === 'afternoon' || step === 'evening') && (
                <RoutinePickerStep
                  block={step}
                  selectedIds={selected[step]}
                  onToggle={(id) => toggleOption(step, id)}
                  customOptions={customRoutines[step]}
                  onAddCustom={(label, emoji) => addCustomRoutine(step, label, emoji)}
                  onRemoveCustom={(id) => removeCustomRoutine(step, id)}
                />
              )}

              {step === 'streak-pick' && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="size-12 rounded-2xl bg-accent-orange/15 flex items-center justify-center">
                    <Flame className="size-6 text-accent-orange" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Want to keep track of something?</h2>
                    <p className="text-black/50 dark:text-white/50 text-[14px] mt-1">
                      Streaks count the consecutive days you show up for something — like going to the
                      gym, playing guitar, or reading a book. Pick an example, or add your own.
                    </p>
                  </div>
                  <StreakExampleGrid
                    options={ONBOARDING_STREAKS}
                    selection={streakSelection}
                    onSelectPreset={(id) => setStreakSelection({ kind: 'preset', id })}
                    onSetCustom={(custom) => setStreakSelection({ kind: 'custom', ...custom })}
                    onClear={() => setStreakSelection(null)}
                  />
                </div>
              )}

              {step === 'streak-setup' && streakDraft && (
                <CreateStreakGuide
                  initialName={streakDraft.name}
                  initialEmoji={streakDraft.emoji}
                  initialColor={streakDraft.color}
                  isReplay={isReplay}
                  onDone={handleStreakDone}
                />
              )}

              {step === 'trial' && (
                <SampleTaskTrial label={trialTask.label} emoji={trialTask.emoji} onDone={goNext} />
              )}

              {step === 'milestone' && <MilestoneUnlock />}

              {step === 'notifications' && <NotificationPrimer userId={user.id} onContinue={goNext} />}

              {step === 'done' && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="size-16 rounded-[22px] bg-gradient-to-br from-accent-green to-accent-teal flex items-center justify-center shadow-[0_12px_30px_-8px_rgba(48,209,88,0.5)]">
                    <PartyPopper className="size-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">You're all set</h1>
                    <p className="text-black/50 dark:text-white/50 text-[15px] mt-2 leading-relaxed">
                      {isReplay
                        ? "That's the tour! Head back to your dashboard whenever you're ready."
                        : `We've added ${selections.length || 'a'} routine${selections.length === 1 ? '' : 's'} to your calendar, organized by time of day. They'll show up on weekdays.${
                            streakCreated ? ` We've also started your first streak — ${streakDraft?.name ?? ''} — good luck!` : ''
                          }`}
                    </p>
                    {!isReplay && (
                      <p className="text-black/40 dark:text-white/40 text-[13px] mt-3 leading-relaxed">
                        Want a different plan for weekends or a holiday? Head to Calendar → Routines to
                        add more packs — Mashed switches between them automatically.
                      </p>
                    )}
                  </div>
                  <Button size="lg" className="w-full" loading={finishing} onClick={() => void handleFinish()}>
                    Go to my dashboard
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {step !== 'trial' &&
          step !== 'notifications' &&
          step !== 'done' &&
          step !== 'streak-pick' &&
          step !== 'streak-setup' && (
            <div className="flex gap-2.5">
              {stepIndex > 0 && (
                <Button variant="secondary" size="lg" className="flex-1" onClick={goBack}>
                  Back
                </Button>
              )}
              <Button size="lg" className="flex-1" onClick={goNext}>
                Continue
              </Button>
            </div>
          )}

        {step === 'streak-pick' && (
          <div className="flex gap-2.5">
            <Button variant="secondary" size="lg" className="flex-1" onClick={skipStreak}>
              Skip for now
            </Button>
            <Button size="lg" className="flex-1" disabled={!streakSelection} onClick={continueToStreakSetup}>
              Continue
            </Button>
          </div>
        )}

        {step === 'streak-setup' && (
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setStepIndex(STREAK_PICK_STEP_INDEX)}
            >
              Back
            </Button>
          </div>
        )}

      </div>
    </GuestPageLayout>
  )
}

const BLOCK_META: Record<
  RoutinePickerBlock,
  { title: string; hint: string; icon: typeof Sunrise }
> = {
  morning: { title: 'Morning routine', hint: 'What kicks off your day?', icon: Sunrise },
  afternoon: { title: 'Afternoon routine', hint: 'What fills your daytime?', icon: Sun },
  evening: { title: 'Evening routine', hint: 'How do you wind down?', icon: Moon },
}

function RoutinePickerStep({
  block,
  selectedIds,
  onToggle,
  customOptions,
  onAddCustom,
  onRemoveCustom,
}: {
  block: RoutinePickerBlock
  selectedIds: string[]
  onToggle: (id: string) => void
  customOptions: CustomRoutineOption[]
  onAddCustom: (label: string, emoji: string) => void
  onRemoveCustom: (id: string) => void
}) {
  const meta = BLOCK_META[block]
  const Icon = meta.icon
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="size-12 rounded-2xl bg-accent-blue/15 flex items-center justify-center">
        <Icon className="size-6 text-accent-blue" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight">{meta.title}</h2>
        <p className="text-black/50 dark:text-white/50 text-[14px] mt-1">
          {meta.hint} Pick as many as you like — you can add more later.
        </p>
      </div>
      <RoutinePillGrid
        options={ONBOARDING_ROUTINES[block]}
        selected={selectedIds}
        onToggle={onToggle}
        customOptions={customOptions}
        onAddCustom={onAddCustom}
        onRemoveCustom={onRemoveCustom}
      />
    </div>
  )
}
