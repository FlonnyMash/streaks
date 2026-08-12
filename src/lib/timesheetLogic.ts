import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
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

/** Parses `HH:MM` or `HH:MM:SS` into seconds from midnight. */
export function parseTimeToSeconds(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? '0')
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null
  return hours * 3600 + minutes * 60 + seconds
}

/** Parses `HH:MM` or `HH:MM:SS` into whole minutes from midnight (seconds truncated). */
export function parseTimeToMinutes(time: string): number | null {
  const totalSeconds = parseTimeToSeconds(time)
  if (totalSeconds == null) return null
  return Math.floor(totalSeconds / 60)
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

/** Duration in minutes between two clock times. Overnight when end < start. Uses seconds when present. */
export function durationFromRange(startTime: string, endTime: string): number | null {
  const start = parseTimeToSeconds(startTime)
  const end = parseTimeToSeconds(endTime)
  if (start == null || end == null || end === start) return null
  const diffSec = end > start ? end - start : end + 24 * 3600 - start
  return Math.max(1, Math.round(diffSec / 60))
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

/** Normalizes any accepted time string to `HH:MM` or `HH:MM:SS` for `<input type="time">` / DB writes. */
export function toTimeInputValue(time: string | null | undefined, withSeconds = false): string {
  if (!time) return ''
  const totalSeconds = parseTimeToSeconds(time)
  if (totalSeconds == null) return ''
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const base = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  if (!withSeconds && seconds === 0 && !/:\d{2}:\d{2}/.test(time.trim())) return base
  return `${base}:${String(seconds).padStart(2, '0')}`
}

const MAX_ENTRY_MINUTES = 24 * 60

/** Live timer label: `m:ss` or `h:mm:ss`. */
export function formatElapsedClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function clockTimeFromDate(date: Date, withSeconds = false): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  if (!withSeconds) return `${hours}:${minutes}`
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/** Builds a completed timesheet draft from a clock-in/out range (keeps seconds). */
export function draftFromTimerRange(startedAt: Date, endedAt: Date) {
  const elapsedMs = Math.max(0, endedAt.getTime() - startedAt.getTime())
  const minutes = Math.min(MAX_ENTRY_MINUTES, Math.max(1, Math.round(elapsedMs / 60_000) || 1))
  return {
    entry_date: toDateKey(startedAt),
    minutes,
    start_time: clockTimeFromDate(startedAt, true),
    end_time: clockTimeFromDate(endedAt, true),
  }
}

/** `YYYY-MM-DDTHH:mm:ss` for `<input type="datetime-local" step="1">`. */
export function toDateTimeLocalValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}:${s}`
}

/** Parses a datetime-local value as a local Date. */
export function fromDateTimeLocalValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim())
  if (!match) return null
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? '0'),
  )
  return Number.isNaN(date.getTime()) ? null : date
}

/* ---------------------------------------------------------------------- */
/* PDF export: range selection + stats                                    */
/* ---------------------------------------------------------------------- */

export const EXPORT_RANGE_KINDS = ['day', 'week', 'month', 'year', 'custom'] as const
export type ExportRangeKind = (typeof EXPORT_RANGE_KINDS)[number]

export interface ExportRange {
  kind: ExportRangeKind
  start: Date
  end: Date
}

/** Computes the [start, end] interval for a navigable preset anchored on a given date. */
export function computePresetRange(kind: Exclude<ExportRangeKind, 'custom'>, anchor: Date): { start: Date; end: Date } {
  switch (kind) {
    case 'day':
      return { start: startOfDay(anchor), end: endOfDay(anchor) }
    case 'week':
      return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) }
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
    case 'year':
      return { start: startOfYear(anchor), end: endOfYear(anchor) }
  }
}

/** Moves the anchor date one unit forward/backward for a given preset kind. */
export function shiftAnchor(kind: Exclude<ExportRangeKind, 'custom'>, anchor: Date, direction: 1 | -1): Date {
  switch (kind) {
    case 'day':
      return addDays(anchor, direction)
    case 'week':
      return addWeeks(anchor, direction)
    case 'month':
      return addMonths(anchor, direction)
    case 'year':
      return addYears(anchor, direction)
  }
}

/** Human-friendly label for a resolved export range, e.g. "March 2026" or "Mar 1 – Mar 7, 2026". */
export function formatExportRangeLabel(range: ExportRange): string {
  const { kind, start, end } = range
  switch (kind) {
    case 'day':
      return format(start, 'EEEE, MMM d, yyyy')
    case 'month':
      return format(start, 'MMMM yyyy')
    case 'year':
      return format(start, 'yyyy')
    case 'week':
    case 'custom': {
      const sameYear = start.getFullYear() === end.getFullYear()
      const startLabel = format(start, sameYear ? 'MMM d' : 'MMM d, yyyy')
      return `${startLabel} – ${format(end, 'MMM d, yyyy')}`
    }
  }
}

/** Filters entries whose entry_date falls within [start, end], inclusive (by date key). */
export function filterEntriesByRange<T extends Pick<TimesheetEntry, 'entry_date'>>(entries: T[], start: Date, end: Date): T[] {
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  return entries.filter((e) => e.entry_date >= startKey && e.entry_date <= endKey)
}

export interface TimesheetExportStats {
  totalMinutes: number
  daysWorked: number
  entryCount: number
  avgMinutesPerWorkedDay: number
  byWorkspace: Array<{ workspaceId: string; minutes: number }>
  byTopic: Array<{ topic: string; minutes: number }>
  byDay: Array<{ dateKey: string; minutes: number }>
}

/** Builds aggregate stats for a set of entries already scoped to the export range. */
export function buildExportStats(entries: TimesheetEntry[]): TimesheetExportStats {
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0)
  const dayMinutes = minutesByDate(entries)

  const byWorkspaceMap = new Map<string, number>()
  const byTopicMap = new Map<string, number>()
  for (const entry of entries) {
    byWorkspaceMap.set(entry.workspace_id, (byWorkspaceMap.get(entry.workspace_id) ?? 0) + entry.minutes)
    const topic = entry.topic?.trim() || 'No topic'
    byTopicMap.set(topic, (byTopicMap.get(topic) ?? 0) + entry.minutes)
  }

  return {
    totalMinutes,
    daysWorked: dayMinutes.size,
    entryCount: entries.length,
    avgMinutesPerWorkedDay: dayMinutes.size > 0 ? Math.round(totalMinutes / dayMinutes.size) : 0,
    byWorkspace: [...byWorkspaceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([workspaceId, minutes]) => ({ workspaceId, minutes })),
    byTopic: [...byTopicMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([topic, minutes]) => ({ topic, minutes })),
    byDay: [...dayMinutes.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, minutes]) => ({ dateKey, minutes })),
  }
}
