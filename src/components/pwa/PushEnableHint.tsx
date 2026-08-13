import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvalidateProfile, useProfile } from '@/hooks/useProfile'
import { enablePush, getNotificationPermission, isPushSupported } from '@/lib/push'
import { getErrorMessage } from '@/lib/errors'

/**
 * Shown when Notify me is on but the device has not allowed notifications.
 * Uses the browser/OS permission API — not an in-app preference toggle.
 */
export function PushEnableHint() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const invalidateProfile = useInvalidateProfile()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isPushSupported()) {
    return (
      <p className="text-[12px] text-accent-orange mt-2 px-0.5">
        This browser doesn’t support push notifications, so reminders can’t be delivered.
      </p>
    )
  }

  const permission = getNotificationPermission()
  const deviceAllows = permission === 'granted' && Boolean(profile?.push_enabled)
  if (deviceAllows) return null

  async function handleAllow() {
    if (!user) return
    setError(null)
    setBusy(true)
    try {
      await enablePush(user.id)
      invalidateProfile()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not enable notifications.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 px-0.5">
      {permission === 'denied' ? (
        <p className="text-[12px] text-accent-orange">
          Notifications are blocked on this device. Open your browser or system settings, allow
          notifications for this app, then come back — we’ll pick that up automatically.
        </p>
      ) : (
        <p className="text-[12px] text-accent-orange">
          Device notifications aren’t allowed yet.{' '}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAllow()}
            className="font-medium underline underline-offset-2 disabled:opacity-50"
          >
            {busy ? 'Requesting…' : 'Allow notifications'}
          </button>{' '}
          so reminders can be delivered.
        </p>
      )}
      {error && <p className="text-[12px] text-accent-red mt-1">{error}</p>}
    </div>
  )
}
