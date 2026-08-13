/** Keep in sync with Supabase Auth → Email → Minimum password length. */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Symbols Supabase accepts when "required characters" includes symbols.
 * See https://supabase.com/docs/guides/auth/password-security
 */
const SYMBOL_PATTERN = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/

/** Lowercased blocklist of very common / trivially guessable passwords. */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  'passw0rd',
  '12345678',
  '123456789',
  '1234567890',
  '0123456789',
  'qwerty12',
  'qwerty123',
  'qwerty1234',
  'abc12345',
  'abcd1234',
  'letmein1',
  'welcome1',
  'welcome12',
  'admin123',
  'iloveyou',
  'iloveyou1',
  'monkey12',
  'dragon12',
  'master12',
  'login123',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'starwars',
  'trustno1',
  'changeme',
  'changeme1',
])

/**
 * Returns an error message if the password is too weak, otherwise `null`.
 * Rules mirror Supabase's strongest Email password settings (length + character classes).
 */
export function validatePasswordStrength(
  password: string,
  options?: { email?: string | null },
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number.'
  }
  if (!SYMBOL_PATTERN.test(password)) {
    return 'Password must include a symbol (e.g. !@#$).'
  }

  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) {
    return 'That password is too common. Choose something harder to guess.'
  }

  const emailLocal = options?.email?.split('@')[0]?.trim().toLowerCase()
  if (emailLocal && emailLocal.length >= 3 && lower.includes(emailLocal)) {
    return 'Password should not contain your email address.'
  }

  return null
}

/** Short hint shown under new-password fields. */
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters, with upper & lowercase, a number, and a symbol.`
