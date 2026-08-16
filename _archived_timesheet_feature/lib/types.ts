/**
 * Timesheet domain types, extracted from `src/lib/types.ts` when the feature was archived.
 * See `../REUSE_GUIDE.md` for how to wire these back up in a standalone app.
 *
 * `AccentColor` and `Mood` are shared with Streaks/Todos — copy their definitions from the
 * active app's `src/lib/types.ts` (or from `../hooks`/`../lib` call sites) when rebuilding.
 */
import type { AccentColor, Mood } from '@/lib/types'

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
  updated_at: string
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

/** Open workspace timer session (persisted in timesheet_sessions). */
export interface TimesheetTimerSession {
  id: string
  workspaceId: string
  /** Null when paused. */
  runningSince: string | null
  topic?: string
}

export interface TimesheetSessionRow {
  id: string
  user_id: string
  workspace_id: string
  running_since: string | null
  topic: string | null
  created_at: string
}

export interface TimesheetSessionDay {
  workspaceId: string
  workDate: string
  seconds: number
}
