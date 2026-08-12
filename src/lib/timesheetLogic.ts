import { eachDayOfInterval, endOfMonth, endOfWeek, isToday, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import type { TimesheetEntry } from './types'
import { toDateKey } from './utils'

export interface TimesheetCalendarDay {
  date: Date
  key: string
  inCurrentMonth: boolean
  isFuture: boolean
  isToday: boolean
  minutes: number
}

export function minutesByDate(entries: Pick<TimesheetEntry, 'entry_date' | 'minutes'>[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of entries) {
    map.set(entry.entry_date, (map.get(entry.entry_date) ?? 0) + entry.minutes)
  }
  return map
}

export function buildTimesheetMonthGrid(year: number, month: number, entries: TimesheetEntry[]): TimesheetCalendarDay[] {
  const byDate = minutesByDate(entries)
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
      minutes: byDate.get(key) ?? 0,
    }
  })
}

/** Sums minutes for entries whose entry_date falls within [start, end] (inclusive, by date key). */
export function periodMinutesTotal(entries: Pick<TimesheetEntry, 'entry_date' | 'minutes'>[], start: Date, end: Date): number {
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  return entries
    .filter((e) => e.entry_date >= startKey && e.entry_date <= endKey)
    .reduce((sum, e) => sum + e.minutes, 0)
}

export function todayWeekMonthTotals(entries: Pick<TimesheetEntry, 'entry_date' | 'minutes'>[]) {
  const today = startOfDay(new Date())
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  return {
    today: periodMinutesTotal(entries, today, today),
    week: periodMinutesTotal(entries, weekStart, weekEnd),
    month: periodMinutesTotal(entries, monthStart, monthEnd),
    total: entries.reduce((sum, e) => sum + e.minutes, 0),
  }
}
