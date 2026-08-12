import { eachDayOfInterval, endOfMonth, endOfWeek, isToday, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import type { TimesheetEntry } from './types'
import { toDateKey } from './utils'

/** Default fast-select chips: 15m, 30m, 1h, 2h, 4h, 8h. */
export const DEFAULT_QUICK_PRESETS = [15, 30, 60, 120, 240, 480]

const MAX_PRESET_MINUTES = 24 * 60
const MAX_PRESETS = 12

/** Dedupes, clamps, and sorts preset minutes for storage/display. */
export function normalizeQuickPresets(presets: number[] | null | undefined): number[] {
  const cleaned = [...new Set(
    (presets ?? [])
      .map((n) => Math.round(n))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= MAX_PRESET_MINUTES),
  )].sort((a, b) => a - b)
  if (cleaned.length === 0) return [...DEFAULT_QUICK_PRESETS]
  return cleaned.slice(0, MAX_PRESETS)
}

export function addQuickPreset(presets: number[], minutes: number): number[] {
  return normalizeQuickPresets([...presets, minutes])
}

export function removeQuickPreset(presets: number[], minutes: number): number[] {
  const next = presets.filter((p) => p !== minutes)
  return next.length > 0 ? normalizeQuickPresets(next) : [...DEFAULT_QUICK_PRESETS]
}

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

/** Parses `HH:MM` or `HH:MM:SS` into minutes from midnight. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Formats a DB/time input value as a compact label like `9:05` or `14:30`. */
export function formatClockTime(time: string | null | undefined): string | null {
  if (!time) return null
  const total = parseTimeToMinutes(time)
  if (total == null) return null
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

/** Duration in minutes between two clock times. Overnight when end < start. */
export function durationFromRange(startTime: string, endTime: string): number | null {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start == null || end == null || end === start) return null
  return end > start ? end - start : end + 24 * 60 - start
}

/** Adds minutes to a clock time and returns `HH:MM` (wraps within 24h). */
export function addMinutesToClock(startTime: string, minutes: number): string | null {
  const start = parseTimeToMinutes(startTime)
  if (start == null) return null
  const total = ((start + minutes) % (24 * 60) + 24 * 60) % (24 * 60)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/** Normalizes any accepted time string to `HH:MM` for `<input type="time">` / DB writes. */
export function toTimeInputValue(time: string | null | undefined): string {
  if (!time) return ''
  const total = parseTimeToMinutes(time)
  if (total == null) return ''
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
