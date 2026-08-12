import type { User } from '@supabase/supabase-js'

/** Must match the age check enforced server-side in `0011_profiles.sql`. */
export const MIN_AGE_YEARS = 16

/** Parse `YYYY-MM-DD` as a calendar date (not UTC midnight). */
function parseCalendarDate(dateOfBirth: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  // Reject impossible calendar dates (e.g. 2000-02-31).
  const probe = new Date(year, month - 1, day)
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null
  }
  return { year, month, day }
}

export function calculateAge(dateOfBirth: string, at: Date = new Date()): number {
  const dob = parseCalendarDate(dateOfBirth)
  if (!dob) return Number.NaN
  let age = at.getFullYear() - dob.year
  const monthDiff = at.getMonth() + 1 - dob.month
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < dob.day)) {
    age -= 1
  }
  return age
}

export function isOldEnough(dateOfBirth: string, at: Date = new Date()): boolean {
  const age = calculateAge(dateOfBirth, at)
  return Number.isFinite(age) && age >= MIN_AGE_YEARS
}

export function isValidPastDate(dateOfBirth: string, at: Date = new Date()): boolean {
  const dob = parseCalendarDate(dateOfBirth)
  if (!dob) return false
  const y = at.getFullYear()
  const m = at.getMonth() + 1
  const d = at.getDate()
  if (dob.year > y) return false
  if (dob.year === y && dob.month > m) return false
  if (dob.year === y && dob.month === m && dob.day > d) return false
  return true
}

/** Best-effort first-name guess from OAuth provider metadata (Google/GitHub). */
export function guessFirstNameFromUser(user: User | null): string {
  if (!user) return ''
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const raw =
    (meta.first_name as string | undefined) ||
    (meta.given_name as string | undefined) ||
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    ''
  return raw.trim().split(/\s+/)[0] ?? ''
}

/** True when the account has no email/password identity, i.e. the email is owned by an OAuth provider. */
export function isOAuthOnlyAccount(user: User | null): boolean {
  if (!user) return false
  const identities = user.identities ?? []
  if (identities.length === 0) return user.app_metadata?.provider !== 'email'
  return !identities.some((identity) => identity.provider === 'email')
}

/** Human-readable provider name for "Managed by …" copy. */
export function primaryProviderLabel(user: User | null): string {
  const provider = user?.app_metadata?.provider as string | undefined
  if (provider === 'google') return 'Google'
  if (provider === 'github') return 'GitHub'
  return 'your sign-in provider'
}
