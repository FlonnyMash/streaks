import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvalidateProfile, useProfile } from '@/hooks/useProfile'
import { enablePush, getNotificationPermission, isPushSupported } from '@/lib/push'
import {
  getNotificationBlockedGuidance,
  isPushPermissionDeniedError,
} from '@/lib/notificationBlocked'
import { getErrorMessage } from '@/lib/errors'
import { NotificationBlockedModal } from '@/components/pwa/NotificationBlockedModal'
import { NotificationInfoModal } from '@/components/pwa/NotificationInfoModal'

/**
 * Shown when Notify me is on but push isn’t ready on this device.
 */
export function PushEnableHint() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const invalidateProfile = useInvalidateProfile()
  const [busy, setBusy] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoBody, setInfoBody] = useState('')

  if (!isPushSupported()) {
    return (
      <p className="text-[12px] text-black/45 dark:text-white/45 mt-2 px-0.5">
        Push isn’t supported here — reminders won’t be delivered.
      </p>
    )
  }

  const permission = getNotificationPermission()
  const deviceAllows = permission === 'granted' && Boolean(profile?.push_enabled)
  if (deviceAllows) return null

  const guidance = getNotificationBlockedGuidance()

  async function handleAllow() {
    if (!user) return
    if (getNotificationPermission() === 'denied') {
      setBlockedOpen(true)
      return
    }
    setBusy(true)
    try {
      await enablePush(user.id)
      invalidateProfile()
    } catch (err) {
      if (isPushPermissionDeniedError(err)) {
        setBlockedOpen(true)
      } else {
        setInfoBody(getErrorMessage(err, 'Could not enable notifications.'))
        setInfoOpen(true)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleTryAgain() {
    if (!user) return
    setBusy(true)
    try {
      await enablePush(user.id)
      invalidateProfile()
      setBlockedOpen(false)
    } catch (err) {
      if (!isPushPermissionDeniedError(err)) {
        setBlockedOpen(false)
        setInfoBody(getErrorMessage(err, 'Could not enable notifications.'))
        setInfoOpen(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 px-0.5">
      <p className="text-[12px] text-black/55 dark:text-white/55">
        {permission === 'denied'
          ? `Blocked in ${guidance.surfaceLabel} settings. `
          : 'Notifications aren’t enabled yet. '}
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleAllow()}
          className="font-medium text-accent-blue underline underline-offset-2 disabled:opacity-50"
        >
          {permission === 'denied' ? 'Fix this' : busy ? 'Requesting…' : 'Enable'}
        </button>
      </p>

      <NotificationBlockedModal
        open={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        onTryAgain={() => void handleTryAgain()}
        tryingAgain={busy}
        guidance={guidance}
      />
      <NotificationInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Couldn’t enable notifications"
        body={infoBody}
      />
    </div>
  )
}
