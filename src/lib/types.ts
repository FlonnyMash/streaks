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
  /** Optional timesheet workspace this task logs time to. */
  workspace_id: string | null
  topics: TodoTopic[]
}

export interface TodoInput {
  title: string
  notes: string | null
  due_date: string | null
  importance: TodoImportance
  workspace_id?: string | null
  /** Topic names to attach. Omitted on update leaves existing links unchanged. */
  topicNames?: string[]
}

export interface TimesheetWorkspace {
  id: string
  user_id: string
  name: string
  emoji: string
  color: AccentColor
  /** Quick-select durations in minutes for the day logger. */
  quick_presets: number[]
  archived: boolean
  created_at: string
}

export interface TimesheetWorkspaceInput {
  name: string
  emoji: string
  color: AccentColor
  quick_presets: number[]
}

export interface TimesheetEntry {
  id: string
  workspace_id: string
  user_id: string
  entry_date: string
  minutes: number
  /** Local clock time `HH:MM:SS` (or `HH:MM`) when the block started, if set. */
  start_time: string | null
  /** Local clock time `HH:MM:SS` (or `HH:MM`) when the block ended, if set. */
  end_time: string | null
  topic: string | null
  note: string | null
  /** Optional 1–3 mood from clock-out ("How was your day?"). */
  mood: Mood | null
  created_at: string
}

export interface TimesheetEntryInput {
  entry_date: string
  minutes: number
  start_time: string | null
  end_time: string | null
  topic: string | null
  note: string | null
  mood: Mood | null
}

/** Running clock-in session (persisted in timesheet_sessions). */
export interface TimesheetTimerSession {
  id: string
  workspaceId: string
  startedAt: string
  topic?: string
}

export interface TimesheetSessionRow {
  id: string
  user_id: string
  workspace_id: string
  started_at: string
  topic: string | null
  created_at: string
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
