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
  /** When true, cron sends a local-time reminder on due days. */
  notify_enabled: boolean
  /** Local wall-clock time `HH:MM:SS` (or `HH:MM`) when notify_enabled. */
  notify_time: string | null
  archived: boolean
  created_at: string
  updated_at: string
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
  notify_enabled: boolean
  notify_time: string | null
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
  updated_at: string
}

/** 1 = low, 2 = medium, 3 = high */
export type TodoImportance = 1 | 2 | 3

export interface TodoTopic {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Todo {
  id: string
  user_id: string
  title: string
  notes: string | null
  done: boolean
  due_date: string | null
  importance: TodoImportance
  position: number
  archived: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
  /** Total minutes tracked when the task was completed (from the todo timer). */
  tracked_minutes: number | null
  /** Overdue / due-day reminders at 20:00 local (requires due_date). */
  notify_enabled: boolean
  topics: TodoTopic[]
}

export interface TodoInput {
  title: string
  notes: string | null
  due_date: string | null
  importance: TodoImportance
  notify_enabled?: boolean
  /** Topic names to attach. Omitted on update leaves existing links unchanged. */
  topicNames?: string[]
}

export interface TodoTimer {
  id: string
  todoId: string
  runningSince: string | null
}

export interface TodoTimerDay {
  todoId: string
  workDate: string
  seconds: number
}

export interface Profile {
  user_id: string
  first_name: string | null
  date_of_birth: string | null
  avatar_url: string | null
  onboarding_required: boolean
  /** Master toggle: user opted into Web Push on at least one device. */
  push_enabled: boolean
  /** IANA timezone captured when enabling push (for local reminder scheduling). */
  timezone: string | null
  created_at: string
  updated_at: string
}

export interface StreakStats {
  currentStreak: number
  longestStreak: number
  completionRate: number
  totalCompletions: number
  totalMinutes: number
}
