import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvalidateProfile } from '@/hooks/useProfile'
import { getNotificationPermission, isPushSupported, syncPushWithDevice } from '@/lib/push'

/**
 * Keeps push_enabled, subscription, and timezone aligned with the device.
 * Timezone is refreshed whenever the app is foregrounded so travel updates scheduling.
 */
export function useSyncPushWithDevice() {
  const { user } = useAuth()
  const invalidateProfile = useInvalidateProfile()
  const running = useRef(false)

  useEffect(() => {
    if (!user || !isPushSupported()) return

    async function sync() {
      if (running.current || !user) return
      // Only sync server when permission is already decided or granted — avoid
      // clearing push_enabled on first paint before the user has opted in via Notify me.
      const permission = getNotificationPermission()
      if (permission === 'default') return

      running.current = true
      try {
        await syncPushWithDevice(user.id)
        invalidateProfile()
      } catch {
        // Non-fatal; next focus retries.
      } finally {
        running.current = false
      }
    }

    void sync()

    function onVisible() {
      if (document.visibilityState === 'visible') void sync()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [user, invalidateProfile])
}
