export type FrequencyType = 'daily' | 'weekdays' | 'times_per_week'

export const ACCENT_COLORS = [
  'blue',
  'green',
  'indigo',
  'orange',
  'pink',
  'red',
  'teal',
  'yellow',
] as const

export type AccentColor = (typeof ACCENT_COLORS)[number]

export interface Streak {
  id: string
  user_id: string
  name: string
  emoji: string
  color: AccentColor
  frequency_type: FrequencyType
  target_weekdays: number[] | null
  target_count: number | null
  archived: boolean
  created_at: string
}

export interface StreakInput {
  name: string
  emoji: string
  color: AccentColor
  frequency_type: FrequencyType
  target_weekdays: number[] | null
  target_count: number | null
}

export type Mood = 1 | 2 | 3

export interface StreakEntry {
  id: string
  streak_id: string
  user_id: string
  entry_date: string
  completed: boolean
  note: string | null
  mood: Mood | null
  created_at: string
}

export interface StreakStats {
  currentStreak: number
  longestStreak: number
  completionRate: number
  totalCompletions: number
}
