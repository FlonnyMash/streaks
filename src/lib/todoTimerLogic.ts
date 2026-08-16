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
  if (seconds <= 0) return 0
  return Math.max(1, Math.round(seconds / 60) || 1)
}

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

/** Like splitElapsedByDay, but keeps a 1s remainder so a short run still counts. */
export function liveChunks(startedAt: Date, endedAt: Date): DaySeconds[] {
  const chunks = splitElapsedByDay(startedAt, endedAt)
  if (chunks.length > 0) return chunks
  const elapsedMs = endedAt.getTime() - startedAt.getTime()
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return []
  return [{ dateKey: toDateKey(endedAt), seconds: Math.max(1, Math.round(elapsedMs / 1000) || 1) }]
}
