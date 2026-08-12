import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import type { Streak, StreakEntry, TimeGoalPeriod, StreakStats } from './types'
import { toDateKey } from './utils'

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Maps a Mon-first index (0=Mon..6=Sun) to JS `Date#getDay()` (0=Sun..6=Sat). */
export function weekdayIndexToJsDay(index: number): number {
  return (index + 1) % 7
}

export function jsDayToWeekdayIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

export function isScheduledDay(streak: Pick<Streak, 'frequency_type' | 'target_weekdays'>, date: Date): boolean {
  if (streak.frequency_type === 'weekdays') {
    const target = streak.target_weekdays ?? []
    if (target.length === 0) return true
    return target.includes(date.getDay())
  }
  // 'daily' and 'times_per_week' streaks can be completed on any day.
  return true
}

function completedDateSet(entries: StreakEntry[]): Set<string> {
  const set = new Set<string>()
  for (const entry of entries) {
    if (entry.completed) set.add(entry.entry_date)
  }
  return set
}

function minutesByDate(entries: StreakEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of entries) {
    if (entry.minutes != null) map.set(entry.entry_date, (map.get(entry.entry_date) ?? 0) + entry.minutes)
  }
  return map
}

function sumMinutes(entries: StreakEntry[]): number {
  let total = 0
  for (const entry of entries) total += entry.minutes ?? 0
  return total
}

/** True when this streak auto-completes a day once that day's logged minutes hit the goal. */
export function hasDayTimeGoal(streak: Pick<Streak, 'track_time' | 'time_goal_period' | 'time_goal_minutes'>): boolean {
  return streak.track_time && streak.time_goal_period === 'day' && streak.time_goal_minutes != null
}

/** True when this streak's completion is driven by a weekly/monthly minutes total instead of per-day checkboxes. */
export function hasPeriodTimeGoal(
  streak: Pick<Streak, 'track_time' | 'time_goal_period' | 'time_goal_minutes'>,
): boolean {
  return (
    streak.track_time &&
    (streak.time_goal_period === 'week' || streak.time_goal_period === 'month') &&
    streak.time_goal_minutes != null
  )
}

const MAX_LOOKBACK_DAYS = 3650
const MAX_LOOKBACK_WEEKS = 520
const MAX_LOOKBACK_MONTHS = 240

function currentStreakDayBased(streak: Streak, completed: Set<string>): number {
  const today = startOfDay(new Date())
  let count = 0
  let cursor = today
  let isFirstScheduledDay = true

  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    if (isScheduledDay(streak, cursor)) {
      const done = completed.has(toDateKey(cursor))
      if (done) {
        count++
        isFirstScheduledDay = false
      } else if (isFirstScheduledDay && isSameDay(cursor, today)) {
        // Today hasn't been checked off yet — don't break the streak, it's just "at risk".
        isFirstScheduledDay = false
      } else {
        break
      }
    }
    cursor = subDays(cursor, 1)
  }

  return count
}

function longestStreakDayBased(streak: Streak, completed: Set<string>): number {
  if (completed.size === 0) return 0
  const earliest = [...completed].sort()[0]
  const [y, m, d] = earliest.split('-').map(Number)
  let cursor = new Date(y, m - 1, d)
  const today = startOfDay(new Date())

  let longest = 0
  let running = 0
  for (let i = 0; i < MAX_LOOKBACK_DAYS && cursor <= today; i++) {
    if (isScheduledDay(streak, cursor)) {
      if (completed.has(toDateKey(cursor))) {
        running++
        longest = Math.max(longest, running)
      } else {
        running = 0
      }
    }
    cursor = addDays(cursor, 1)
  }
  return longest
}

function weekCompletionCount(weekStart: Date, completed: Set<string>): number {
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  return days.filter((d) => completed.has(toDateKey(d))).length
}

function currentStreakTimesPerWeek(streak: Streak, completed: Set<string>): number {
  const target = streak.target_count ?? 1
  const today = startOfDay(new Date())
  let count = 0
  let weekStart = startOfWeek(today, { weekStartsOn: 1 })
  let isCurrentWeek = true

  for (let i = 0; i < MAX_LOOKBACK_WEEKS; i++) {
    const qualifies = weekCompletionCount(weekStart, completed) >= target
    if (qualifies) {
      count++
      isCurrentWeek = false
    } else if (isCurrentWeek) {
      isCurrentWeek = false
    } else {
      break
    }
    weekStart = subWeeks(weekStart, 1)
  }

  return count
}

function longestStreakTimesPerWeek(streak: Streak, completed: Set<string>): number {
  if (completed.size === 0) return 0
  const target = streak.target_count ?? 1
  const earliest = [...completed].sort()[0]
  const [y, m, d] = earliest.split('-').map(Number)
  let weekStart = startOfWeek(new Date(y, m - 1, d), { weekStartsOn: 1 })
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  let longest = 0
  let running = 0
  for (let i = 0; i < MAX_LOOKBACK_WEEKS && weekStart <= thisWeekStart; i++) {
    if (weekCompletionCount(weekStart, completed) >= target) {
      running++
      longest = Math.max(longest, running)
    } else {
      running = 0
    }
    weekStart = addDays(weekStart, 7)
  }
  return longest
}

function weekMinutesSum(weekStart: Date, minutes: Map<string, number>): number {
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  return days.reduce((sum, d) => sum + (minutes.get(toDateKey(d)) ?? 0), 0)
}

function monthMinutesSum(monthStart: Date, minutes: Map<string, number>): number {
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) })
  return days.reduce((sum, d) => sum + (minutes.get(toDateKey(d)) ?? 0), 0)
}

interface PeriodStepper {
  periodStart: (date: Date) => Date
  prevPeriod: (date: Date) => Date
  nextPeriod: (date: Date) => Date
  periodSum: (periodStart: Date, minutes: Map<string, number>) => number
  maxLookback: number
}

const WEEK_STEPPER: PeriodStepper = {
  periodStart: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  prevPeriod: (date) => subWeeks(date, 1),
  nextPeriod: (date) => addDays(date, 7),
  periodSum: weekMinutesSum,
  maxLookback: MAX_LOOKBACK_WEEKS,
}

const MONTH_STEPPER: PeriodStepper = {
  periodStart: (date) => startOfMonth(date),
  prevPeriod: (date) => subMonths(date, 1),
  nextPeriod: (date) => addMonths(date, 1),
  periodSum: monthMinutesSum,
  maxLookback: MAX_LOOKBACK_MONTHS,
}

function stepperForPeriod(period: TimeGoalPeriod): PeriodStepper {
  return period === 'month' ? MONTH_STEPPER : WEEK_STEPPER
}

/** Current streak (in qualifying weeks/months) for a streak whose completion is driven by a weekly/monthly minutes goal. */
function currentStreakTimeGoal(streak: Streak, minutes: Map<string, number>): number {
  const stepper = stepperForPeriod(streak.time_goal_period as TimeGoalPeriod)
  const goal = streak.time_goal_minutes ?? 0
  let count = 0
  let cursor = stepper.periodStart(startOfDay(new Date()))
  let isCurrentPeriod = true

  for (let i = 0; i < stepper.maxLookback; i++) {
    const qualifies = stepper.periodSum(cursor, minutes) >= goal
    if (qualifies) {
      count++
      isCurrentPeriod = false
    } else if (isCurrentPeriod) {
      // The current (in-progress) period hasn't hit the goal yet — don't break the streak, it's at risk.
      isCurrentPeriod = false
    } else {
      break
    }
    cursor = stepper.prevPeriod(cursor)
  }
  return count
}

function longestStreakTimeGoal(streak: Streak, minutes: Map<string, number>): number {
  if (minutes.size === 0) return 0
  const stepper = stepperForPeriod(streak.time_goal_period as TimeGoalPeriod)
  const goal = streak.time_goal_minutes ?? 0
  const earliest = [...minutes.keys()].sort()[0]
  const [y, m, d] = earliest.split('-').map(Number)
  let cursor = stepper.periodStart(new Date(y, m - 1, d))
  const currentPeriodStart = stepper.periodStart(new Date())

  let longest = 0
  let running = 0
  for (let i = 0; i < stepper.maxLookback && cursor <= currentPeriodStart; i++) {
    if (stepper.periodSum(cursor, minutes) >= goal) {
      running++
      longest = Math.max(longest, running)
    } else {
      running = 0
    }
    cursor = stepper.nextPeriod(cursor)
  }
  return longest
}

/** Counts elapsed periods (weeks/months) since creation and how many hit the minutes goal, for completion-rate. */
function periodGoalCounts(
  streak: Streak,
  minutes: Map<string, number>,
  createdAt: Date,
  today: Date,
): { scheduled: number; completed: number } {
  const stepper = stepperForPeriod(streak.time_goal_period as TimeGoalPeriod)
  const goal = streak.time_goal_minutes ?? 0
  const currentPeriodStart = stepper.periodStart(today)
  let cursor = stepper.periodStart(createdAt)
  let scheduled = 0
  let completed = 0

  while (cursor <= currentPeriodStart && scheduled < stepper.maxLookback) {
    scheduled++
    if (stepper.periodSum(cursor, minutes) >= goal) completed++
    cursor = stepper.nextPeriod(cursor)
  }
  return { scheduled, completed }
}

/** Counts elapsed calendar weeks since creation and how many met the times-per-week target. */
function timesPerWeekCounts(
  streak: Streak,
  completed: Set<string>,
  createdAt: Date,
  today: Date,
): { scheduled: number; completed: number } {
  const target = streak.target_count ?? 1
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  let cursor = startOfWeek(createdAt, { weekStartsOn: 1 })
  let scheduled = 0
  let completedWeeks = 0

  while (cursor <= thisWeekStart && scheduled < MAX_LOOKBACK_WEEKS) {
    scheduled++
    if (weekCompletionCount(cursor, completed) >= target) completedWeeks++
    cursor = addDays(cursor, 7)
  }
  return { scheduled, completed: completedWeeks }
}

export function computeStreakStats(streak: Streak, entries: StreakEntry[]): StreakStats {
  const completed = completedDateSet(entries)
  const minutes = minutesByDate(entries)
  const totalCompletions = completed.size
  const totalMinutes = sumMinutes(entries)
  const createdAt = startOfDay(new Date(streak.created_at))
  const today = startOfDay(new Date())
  const periodGoal = hasPeriodTimeGoal(streak)

  let currentStreak: number
  let longestStreak: number

  if (periodGoal) {
    currentStreak = currentStreakTimeGoal(streak, minutes)
    longestStreak = Math.max(longestStreakTimeGoal(streak, minutes), currentStreak)
  } else if (streak.frequency_type === 'times_per_week') {
    currentStreak = currentStreakTimesPerWeek(streak, completed)
    longestStreak = Math.max(longestStreakTimesPerWeek(streak, completed), currentStreak)
  } else {
    // Covers both the legacy checkbox-driven schedule and day-goal time tracking — in both
    // cases `completed` already reflects the right thing per entry (see useLogMinutes).
    currentStreak = currentStreakDayBased(streak, completed)
    longestStreak = Math.max(longestStreakDayBased(streak, completed), currentStreak)
  }

  let scheduledCount: number
  let completedCount: number

  if (periodGoal) {
    const counts = periodGoalCounts(streak, minutes, createdAt, today)
    scheduledCount = counts.scheduled
    completedCount = counts.completed
  } else if (streak.frequency_type === 'times_per_week') {
    const counts = timesPerWeekCounts(streak, completed, createdAt, today)
    scheduledCount = counts.scheduled
    completedCount = counts.completed
  } else {
    scheduledCount = 0
    let cursor = createdAt
    while (cursor <= today) {
      if (isScheduledDay(streak, cursor)) scheduledCount++
      cursor = addDays(cursor, 1)
    }
    completedCount = totalCompletions
  }

  const completionRate = scheduledCount > 0 ? Math.min(1, completedCount / scheduledCount) : 0

  return { currentStreak, longestStreak, completionRate, totalCompletions, totalMinutes }
}

export interface CalendarDay {
  date: Date
  key: string
  inCurrentMonth: boolean
  isFuture: boolean
  isToday: boolean
  isScheduled: boolean
  completed: boolean
  hasNote: boolean
  minutes: number
  goalMinutes: number | null
}

export function buildMonthGrid(
  year: number,
  month: number,
  streak: Streak,
  entries: StreakEntry[],
): CalendarDay[] {
  const completed = completedDateSet(entries)
  const minutes = minutesByDate(entries)
  // Notes can exist on period-goal days that are not marked `completed`.
  const notedDates = new Set(entries.filter((e) => e.note).map((e) => e.entry_date))
  const monthStart = startOfMonth(new Date(year, month, 1))
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const today = startOfDay(new Date())
  const goalMinutes = hasDayTimeGoal(streak) ? streak.time_goal_minutes : null
  // Period goals qualify on week/month totals — never treat a single day as "done" from `completed`.
  const ignoreDayCompleted = hasPeriodTimeGoal(streak)

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => {
    const key = toDateKey(date)
    return {
      date,
      key,
      inCurrentMonth: date.getMonth() === month,
      isFuture: startOfDay(date) > today,
      isToday: isToday(date),
      isScheduled: isScheduledDay(streak, date),
      completed: ignoreDayCompleted ? false : completed.has(key),
      hasNote: notedDates.has(key),
      minutes: minutes.get(key) ?? 0,
      goalMinutes,
    }
  })
}

export function monthCompletionSummary(
  streak: Streak,
  entries: StreakEntry[],
  year: number,
  month: number,
): { completed: number; scheduled: number } {
  const completed = completedDateSet(entries)
  const monthStart = startOfMonth(new Date(year, month, 1))
  const monthEnd = endOfMonth(monthStart)
  const today = startOfDay(new Date())
  const lastRelevantDay = monthEnd < today ? monthEnd : today

  let scheduled = 0
  let done = 0
  if (monthStart <= lastRelevantDay) {
    for (const date of eachDayOfInterval({ start: monthStart, end: lastRelevantDay })) {
      if (isScheduledDay(streak, date)) {
        scheduled++
        if (completed.has(toDateKey(date))) done++
      }
    }
  }
  return { completed: done, scheduled }
}
