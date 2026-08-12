/** Time-of-day greeting based on the device's local clock. */
export function getTimeGreeting(at: Date = new Date()): string {
  const hour = at.getHours()
  if (hour < 5) return 'Good night'
  if (hour < 10) return 'Good Morning'
  if (hour < 14) return 'Hey'
  if (hour < 18) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Good night'
}

/** True when `dateOfBirth` (YYYY-MM-DD) shares today's month/day, regardless of year. */
export function isBirthdayToday(dateOfBirth: string | null | undefined, at: Date = new Date()): boolean {
  if (!dateOfBirth) return false
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim())
  if (!match) return false
  const month = Number(match[1])
  const day = Number(match[2])
  return at.getMonth() + 1 === month && at.getDate() === day
}
