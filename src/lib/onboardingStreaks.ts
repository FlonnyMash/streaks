import type { AccentColor } from './types'

export interface OnboardingStreakOption {
  id: string
  label: string
  emoji: string
  color: AccentColor
}

/** Example habits shown during onboarding's "want to keep track of something?" step. */
export const ONBOARDING_STREAKS: OnboardingStreakOption[] = [
  { id: 'streak-gym', label: 'Going to the gym', emoji: '🏋️', color: 'red' },
  { id: 'streak-guitar', label: 'Playing the guitar', emoji: '🎸', color: 'indigo' },
  { id: 'streak-reading', label: 'Reading a book', emoji: '📚', color: 'orange' },
  { id: 'streak-running', label: 'Running', emoji: '🏃', color: 'green' },
  { id: 'streak-meditating', label: 'Meditating', emoji: '🧘', color: 'teal' },
]

export function findOnboardingStreakOption(id: string): OnboardingStreakOption | undefined {
  return ONBOARDING_STREAKS.find((o) => o.id === id)
}
