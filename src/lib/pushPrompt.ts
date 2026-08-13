import { isFirstLogin } from '@/lib/passkeyPrompt'

const STORAGE_PREFIX = 'push-setup-prompt:'

export type PushPromptState = 'dismissed' | 'completed'

export function getPushPromptState(userId: string): PushPromptState | null {
  const value = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
  if (value === 'dismissed' || value === 'completed') return value
  return null
}

export function setPushPromptState(userId: string, state: PushPromptState) {
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, state)
}

export { isFirstLogin }
