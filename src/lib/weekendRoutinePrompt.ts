import { toDateKey } from '@/lib/utils'

const STORAGE_PREFIX = 'weekend-routine-prompt:'

/** Saturday of the weekend containing `date` (Sun → previous Sat). */
export function weekendSaturdayKey(date = new Date()): string {
  const saturday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = saturday.getDay()
  if (day === 0) saturday.setDate(saturday.getDate() - 1)
  return toDateKey(saturday)
}

export function wasWeekendRoutinePromptDismissed(userId: string, date = new Date()): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === weekendSaturdayKey(date)
  } catch {
    return false
  }
}

export function dismissWeekendRoutinePrompt(userId: string, date = new Date()) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, weekendSaturdayKey(date))
  } catch {
    // Ignore quota / private-mode failures — the prompt may reappear this weekend.
  }
}
