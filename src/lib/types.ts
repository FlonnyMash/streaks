export type FrequencyType = 'daily' | 'weekdays' | 'times_per_week'

export type TimeGoalPeriod = 'day' | 'week' | 'month'

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
  track_time: boolean
  time_goal_minutes: number | null
  time_goal_period: TimeGoalPeriod | null
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
  track_time: boolean
  time_goal_minutes: number | null
  time_goal_period: TimeGoalPeriod | null
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
  minutes: number | null
  created_at: string
}

export interface Todo {
  id: string
  user_id: string
  title: string
  notes: string | null
  done: boolean
  due_date: string | null
  position: number
  archived: boolean
  completed_at: string | null
  created_at: string
}

export interface TodoInput {
  title: string
  notes: string | null
  due_date: string | null
}

export interface TimesheetWorkspace {
  id: string
  user_id: string
  name: string
  emoji: string
  color: AccentColor
  archived: boolean
  created_at: string
}

export interface TimesheetWorkspaceInput {
  name: string
  emoji: string
  color: AccentColor
}

export interface TimesheetEntry {
  id: string
  workspace_id: string
  user_id: string
  entry_date: string
  minutes: number
  topic: string | null
  note: string | null
  created_at: string
}

export interface TimesheetEntryInput {
  entry_date: string
  minutes: number
  topic: string | null
  note: string | null
}

export interface StreakStats {
  currentStreak: number
  longestStreak: number
  completionRate: number
  totalCompletions: number
  totalMinutes: number
}
