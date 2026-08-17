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

/** Tiimo-style time-of-day block a task belongs to; 'anytime' means unscheduled. */
export type RoutineBlock = 'morning' | 'afternoon' | 'evening' | 'anytime'

export const ROUTINE_BLOCKS: RoutineBlock[] = ['morning', 'afternoon', 'evening', 'anytime']

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
  /** Which part of the day this task belongs to. Defaults to 'anytime'. */
  routine: RoutineBlock
  /** Planned duration in minutes (e.g. 10/15/30), independent of `tracked_minutes`. */
  estimated_minutes: number | null
  topics: TodoTopic[]
}

export interface TodoInput {
  title: string
  notes: string | null
  due_date: string | null
  importance: TodoImportance
  notify_enabled?: boolean
  routine?: RoutineBlock
  estimated_minutes?: number | null
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
  /**
   * Whether the guided routine/notification tour has been finished.
   * Optional because persisted React Query cache from before this column existed
   * omits the field; those accounts were grandfathered complete on the server.
   */
  onboarding_tour_completed?: boolean
  /** Master toggle: user opted into Web Push on at least one device. */
  push_enabled: boolean
  /** IANA timezone captured when enabling push (for local reminder scheduling). */
  timezone: string | null
  created_at: string
  updated_at: string
}

/**
 * A named, switchable set of calendar routine items (e.g. "Weekdays", "Weekend",
 * "Holiday"). `auto_apply_days` lists which days of the week (0=Sun..6=Sat) it
 * applies to automatically; `null`/empty means it's manual-only (only ever
 * applied via a `CalendarRoutineOverride`). At most one active pack should own
 * any given weekday. Any pack can also be pinned to a date range via an
 * override, which always takes priority over the day-of-week schedule.
 */
export interface CalendarRoutine {
  id: string
  user_id: string
  name: string
  emoji: string
  position: number
  auto_apply_days: number[] | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface CalendarRoutineInput {
  name: string
  emoji: string
  auto_apply_days?: number[] | null
}

/** A repeating Morning/Afternoon/Evening calendar routine template (distinct from Streak/Todo). */
export interface CalendarRoutineItem {
  id: string
  user_id: string
  routine_id: string
  title: string
  emoji: string
  block: Exclude<RoutineBlock, 'anytime'>
  estimated_minutes: number | null
  position: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface CalendarRoutineItemInput {
  routine_id: string
  title: string
  emoji: string
  block: Exclude<RoutineBlock, 'anytime'>
  estimated_minutes?: number | null
}

/**
 * Pins a pack to a date range, overriding its normal day-of-week schedule
 * (e.g. a week of holidays, or "just today"). `end_date: null` means
 * indefinite — the override stays active until cleared or replaced.
 */
export interface CalendarRoutineOverride {
  id: string
  user_id: string
  start_date: string
  end_date: string | null
  /** `null` means hide auto-apply for this range ("no routine this day"). */
  routine_id: string | null
  created_at: string
  updated_at: string
}

/** Per-day completion of a CalendarRoutineItem — one row per (item, date) actually checked off. */
export interface CalendarRoutineLog {
  id: string
  item_id: string
  user_id: string
  entry_date: string
  completed: boolean
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
