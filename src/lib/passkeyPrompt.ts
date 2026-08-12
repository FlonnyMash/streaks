const STORAGE_PREFIX = 'passkey-setup-prompt:'

export type PasskeyPromptState = 'dismissed' | 'completed'

export function getPasskeyPromptState(userId: string): PasskeyPromptState | null {
  const value = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
  if (value === 'dismissed' || value === 'completed') return value
  return null
}

export function setPasskeyPromptState(userId: string, state: PasskeyPromptState) {
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, state)
}

/** True when the account was created around the same time as the latest sign-in. */
export function isFirstLogin(createdAt: string, lastSignInAt: string | undefined): boolean {
  const created = new Date(createdAt).getTime()
  const lastSignIn = lastSignInAt ? new Date(lastSignInAt).getTime() : created
  return lastSignIn - created < 2 * 60 * 1000
}
