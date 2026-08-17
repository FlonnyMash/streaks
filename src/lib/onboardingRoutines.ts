import type { AccentColor, RoutineBlock } from './types'

export interface OnboardingRoutineOption {
  id: string
  label: string
  emoji: string
  estimated_minutes: number
  color: AccentColor
}

/** Emoji-pill catalog shown during onboarding's Morning/Afternoon/Evening routine pickers. */
export const ONBOARDING_ROUTINES: Record<Exclude<RoutineBlock, 'anytime'>, OnboardingRoutineOption[]> = {
  morning: [
    { id: 'morning-breakfast', label: 'Breakfast', emoji: '🍳', estimated_minutes: 10, color: 'orange' },
    { id: 'morning-shower', label: 'Shower', emoji: '🚿', estimated_minutes: 15, color: 'teal' },
    { id: 'morning-dressed', label: 'Get dressed', emoji: '👕', estimated_minutes: 10, color: 'blue' },
    { id: 'morning-meditate', label: 'Meditate', emoji: '🧘', estimated_minutes: 10, color: 'indigo' },
    { id: 'morning-bed', label: 'Make bed', emoji: '🛏️', estimated_minutes: 5, color: 'pink' },
    { id: 'morning-stretch', label: 'Stretch', emoji: '🤸', estimated_minutes: 10, color: 'green' },
    { id: 'morning-journal', label: 'Journal', emoji: '📓', estimated_minutes: 10, color: 'yellow' },
  ],
  afternoon: [
    { id: 'afternoon-focus', label: 'Focus Work', emoji: '💻', estimated_minutes: 60, color: 'blue' },
    { id: 'afternoon-lunch', label: 'Lunch', emoji: '🍽️', estimated_minutes: 30, color: 'orange' },
    { id: 'afternoon-dog', label: 'Walk dog', emoji: '🐕', estimated_minutes: 20, color: 'green' },
    { id: 'afternoon-errands', label: 'Errands', emoji: '🛒', estimated_minutes: 30, color: 'yellow' },
    { id: 'afternoon-study', label: 'Study', emoji: '📚', estimated_minutes: 45, color: 'indigo' },
    { id: 'afternoon-exercise', label: 'Exercise', emoji: '🏋️', estimated_minutes: 30, color: 'red' },
    { id: 'afternoon-call', label: 'Call a friend', emoji: '📞', estimated_minutes: 15, color: 'teal' },
  ],
  evening: [
    { id: 'evening-teeth', label: 'Brush teeth', emoji: '🪥', estimated_minutes: 5, color: 'teal' },
    { id: 'evening-dinner', label: 'Dinner', emoji: '🍜', estimated_minutes: 30, color: 'orange' },
    { id: 'evening-read', label: 'Read', emoji: '📖', estimated_minutes: 20, color: 'indigo' },
    { id: 'evening-skincare', label: 'Skincare', emoji: '🧴', estimated_minutes: 10, color: 'pink' },
    { id: 'evening-wind-down', label: 'Wind down', emoji: '🌙', estimated_minutes: 15, color: 'blue' },
    { id: 'evening-plan', label: 'Plan tomorrow', emoji: '🗒️', estimated_minutes: 10, color: 'green' },
  ],
}

export function findOnboardingRoutineOption(id: string): OnboardingRoutineOption | undefined {
  for (const options of Object.values(ONBOARDING_ROUTINES)) {
    const found = options.find((o) => o.id === id)
    if (found) return found
  }
  return undefined
}
