import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns'
import type { Streak, StreakEntry, StreakStats } from './types'
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

const MAX_LOOKBACK_DAYS = 3650
const MAX_LOOKBACK_WEEKS = 520

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

export function computeStreakStats(streak: Streak, entries: StreakEntry[]): StreakStats {
  const completed = completedDateSet(entries)
  const totalCompletions = completed.size
  const createdAt = startOfDay(new Date(streak.created_at))
  const today = startOfDay(new Date())

  let currentStreak: number
  let longestStreak: number

  if (streak.frequency_type === 'times_per_week') {
    currentStreak = currentStreakTimesPerWeek(streak, completed)
    longestStreak = Math.max(longestStreakTimesPerWeek(streak, completed), currentStreak)
  } else {
    currentStreak = currentStreakDayBased(streak, completed)
    longestStreak = Math.max(longestStreakDayBased(streak, completed), currentStreak)
  }

  let scheduledCount = 0
  if (streak.frequency_type === 'times_per_week') {
    const weeks = Math.max(1, Math.ceil((today.getTime() - createdAt.getTime()) / (7 * 86400000)) + 1)
    scheduledCount = weeks * (streak.target_count ?? 1)
  } else {
    let cursor = createdAt
    while (cursor <= today) {
      if (isScheduledDay(streak, cursor)) scheduledCount++
      cursor = addDays(cursor, 1)
    }
  }

  const completionRate = scheduledCount > 0 ? Math.min(1, totalCompletions / scheduledCount) : 0

  return { currentStreak, longestStreak, completionRate, totalCompletions }
}

export interface CalendarDay {
  date: Date
  key: string
  inCurrentMonth: boolean
  isFuture: boolean
  isToday: boolean
  isScheduled: boolean
  completed: boolean
}

export function buildMonthGrid(
  year: number,
  month: number,
  streak: Streak,
  entries: StreakEntry[],
): CalendarDay[] {
  const completed = completedDateSet(entries)
  const monthStart = startOfMonth(new Date(year, month, 1))
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const today = startOfDay(new Date())

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => {
    const key = toDateKey(date)
    return {
      date,
      key,
      inCurrentMonth: date.getMonth() === month,
      isFuture: startOfDay(date) > today,
      isToday: isToday(date),
      isScheduled: isScheduledDay(streak, date),
      completed: completed.has(key),
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
