import { toDateKey } from '@/lib/utils'

export interface DaySeconds {
  dateKey: string
  seconds: number
}

/** Splits a running interval across local midnights. */
export function splitElapsedByDay(startedAt: Date, endedAt: Date): DaySeconds[] {
  const startMs = startedAt.getTime()
  const endMs = endedAt.getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return []

  const chunks: DaySeconds[] = []
  let cursor = new Date(startedAt)

  while (cursor.getTime() < endMs) {
    const nextMidnight = new Date(cursor)
    nextMidnight.setHours(24, 0, 0, 0)
    const sliceEndMs = Math.min(nextMidnight.getTime(), endMs)
    const seconds = Math.max(0, Math.floor((sliceEndMs - cursor.getTime()) / 1000))
    if (seconds > 0) {
      chunks.push({ dateKey: toDateKey(cursor), seconds })
    }
    cursor = new Date(sliceEndMs)
  }

  return chunks
}

export function addDaySeconds(existing: DaySeconds[], chunks: DaySeconds[]): DaySeconds[] {
  const byDate = new Map(existing.map((row) => [row.dateKey, row.seconds]))
  for (const chunk of chunks) {
    byDate.set(chunk.dateKey, (byDate.get(chunk.dateKey) ?? 0) + chunk.seconds)
  }
  return [...byDate.entries()]
    .map(([dateKey, seconds]) => ({ dateKey, seconds }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

export function totalSeconds(days: DaySeconds[]): number {
  return days.reduce((sum, row) => sum + row.seconds, 0)
}

export function minutesFromSeconds(seconds: number): number {
  return Math.max(0, Math.round(seconds / 60))
}
