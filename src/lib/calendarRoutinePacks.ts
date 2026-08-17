import { supabase } from '@/lib/supabaseClient'
import type { CalendarRoutine, CalendarRoutineOverride } from '@/lib/types'

export const DEFAULT_ROUTINE_PACK_EMOJI = '📅'

/** 0=Sun..6=Sat, matching JS Date#getDay(). */
export const WEEKDAY_SCHEDULE = [1, 2, 3, 4, 5]
export const WEEKEND_SCHEDULE = [0, 6]
export const EVERY_DAY_SCHEDULE = [0, 1, 2, 3, 4, 5, 6]

/** Display order Mon→Sun. Values are JS `Date#getDay()` (0=Sun..6=Sat). */
export const SCHEDULE_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function isWeekendDate(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** True when any active pack already auto-applies on Saturday or Sunday. */
export function hasWeekendSchedule(routines: CalendarRoutine[]): boolean {
  return routines.some((r) => !r.archived && r.auto_apply_days?.some((d) => d === 0 || d === 6))
}

/** Pack to reuse as the weekday source — prefers one that covers Friday, else the first active pack. */
export function weekdaySourceRoutine(routines: CalendarRoutine[]): CalendarRoutine | null {
  const active = routines.filter((r) => !r.archived)
  return active.find((r) => r.auto_apply_days?.includes(5)) ?? active[0] ?? null
}

function sameDaySet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((d) => set.has(d))
}

export type SchedulePreset = 'weekdays' | 'weekends' | 'everyday' | 'custom' | 'none'

/** Classifies a pack's `auto_apply_days` into one of the preset chips shown in the editor. */
export function schedulePresetFor(days: number[] | null): SchedulePreset {
  if (!days || days.length === 0) return 'none'
  if (sameDaySet(days, WEEKDAY_SCHEDULE)) return 'weekdays'
  if (sameDaySet(days, WEEKEND_SCHEDULE)) return 'weekends'
  if (sameDaySet(days, EVERY_DAY_SCHEDULE)) return 'everyday'
  return 'custom'
}

/**
 * Picks which pack applies to a given calendar day:
 * 1. An explicit override (date range) always wins (e.g. a holiday week).
 *    A hide (`routine_id` null) or a pin to a missing/archived pack does not
 *    fall through to the weekday schedule — the pin still owns that day.
 * 2. Otherwise the pack whose auto-apply schedule includes that weekday applies.
 * No fallback — a Weekdays pack must not appear selected on Saturday/Sunday.
 */
export function resolveRoutineForDate(
  routines: CalendarRoutine[],
  override: CalendarRoutineOverride | null | undefined,
  date: Date,
): CalendarRoutine | null {
  const active = routines.filter((r) => !r.archived)

  if (override) {
    if (!override.routine_id) return null
    return active.find((r) => r.id === override.routine_id) ?? null
  }

  const day = date.getDay()
  return active.find((r) => r.auto_apply_days?.includes(day)) ?? null
}

export function overrideCoversDate(
  override: Pick<CalendarRoutineOverride, 'start_date' | 'end_date'>,
  dateKey: string,
): boolean {
  return override.start_date <= dateKey && (override.end_date === null || override.end_date >= dateKey)
}

export function overrideRangesOverlap(
  a: Pick<CalendarRoutineOverride, 'start_date' | 'end_date'>,
  b: Pick<CalendarRoutineOverride, 'start_date' | 'end_date'>,
): boolean {
  const aEndsAfterBStarts = a.end_date === null || a.end_date >= b.start_date
  const bEndsAfterAStarts = b.end_date === null || b.end_date >= a.start_date
  return aEndsAfterBStarts && bEndsAfterAStarts
}

/**
 * Enforces "at most one override covers any given date" — deletes any of the
 * user's existing overrides that overlap `[startDate, endDate]` (last-write-wins).
 * `endDate: null` means an indefinite range (open-ended into the future).
 */
export async function deleteOverlappingCalendarRoutineOverrides(
  userId: string,
  startDate: string,
  endDate: string | null,
): Promise<void> {
  let query = supabase.from('calendar_routine_overrides').delete().eq('user_id', userId)
  if (endDate) query = query.lte('start_date', endDate)
  query = query.or(`end_date.is.null,end_date.gte.${startDate}`)
  const { error } = await query
  if (error) throw error
}

/** Assigns `days` to one pack and strips those weekdays from every other pack, atomically. */
export async function setCalendarRoutineSchedule(routineId: string, days: number[]): Promise<void> {
  const { error } = await supabase.rpc('set_calendar_routine_schedule', {
    p_routine_id: routineId,
    p_days: days.length ? days : null,
  })
  if (error) throw error
}

/** The override (if any) covering `dateKey`, scoped to the current user via RLS. */
export async function fetchCalendarRoutineOverrideForDate(
  dateKey: string,
): Promise<CalendarRoutineOverride | null> {
  const { data, error } = await supabase
    .from('calendar_routine_overrides')
    .select('*')
    .lte('start_date', dateKey)
    .or(`end_date.is.null,end_date.gte.${dateKey}`)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as CalendarRoutineOverride | null) ?? null
}
