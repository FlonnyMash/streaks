import { useEffect, useState } from 'react'
import { Bell, CalendarCheck, Clock3, ListTodo } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInvalidateProfile } from '@/hooks/useProfile'
import { getPasskeyPromptState } from '@/lib/passkeyPrompt'
import { enablePush, getNotificationPermission, isPushSupported } from '@/lib/push'
import { isPushPermissionDeniedError } from '@/lib/notificationBlocked'
import { getPushPromptState, isFirstLogin, setPushPromptState } from '@/lib/pushPrompt'
import { getErrorMessage } from '@/lib/errors'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import { NotificationBlockedModal } from '@/components/pwa/NotificationBlockedModal'

/**
 * First-sign-in soft ask for notifications (explains why).
 * Yes → browser/OS permission prompt. Later → Settings anytime.
 * Waits for the passkey prompt to finish so modals don’t stack.
 */
export function PushSetupPrompt() {
  const { user } = useAuth()
  const invalidateProfile = useInvalidateProfile()
  const [open, setOpen] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passkeySettled, setPasskeySettled] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const userId = user.id

    if (getPasskeyPromptState(userId)) {
      setPasskeySettled(true)
      return
    }

    const interval = window.setInterval(() => {
      if (getPasskeyPromptState(userId)) {
        setPasskeySettled(true)
        window.clearInterval(interval)
      }
    }, 400)

    const timeout = window.setTimeout(() => {
      setPasskeySettled(true)
      window.clearInterval(interval)
    }, 2800)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [user])

  useEffect(() => {
    if (!user || !passkeySettled) return

    const userId = user.id
    if (getPushPromptState(userId)) return
    if (!isFirstLogin(user.created_at, user.last_sign_in_at)) return

    if (!isPushSupported() || !import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      setPushPromptState(userId, 'dismissed')
      return
    }

    const permission = getNotificationPermission()
    if (permission === 'granted') {
      void enablePush(userId)
        .then(() => {
          setPushPromptState(userId, 'completed')
          invalidateProfile()
        })
        .catch(() => {
          setPushPromptState(userId, 'dismissed')
        })
      return
    }
    if (permission === 'denied') {
      setPushPromptState(userId, 'dismissed')
      return
    }

    setOpen(true)
  }, [user, passkeySettled, invalidateProfile])

  function dismiss() {
    if (!user) return
    setPushPromptState(user.id, 'dismissed')
    setOpen(false)
    setError(null)
  }

  async function handleYes() {
    if (!user) return
    setError(null)
    setEnabling(true)
    try {
      await enablePush(user.id)
      setPushPromptState(user.id, 'completed')
      invalidateProfile()
      setOpen(false)
    } catch (err) {
      setPushPromptState(user.id, 'dismissed')
      setOpen(false)
      if (isPushPermissionDeniedError(err)) {
        setBlockedOpen(true)
      } else {
        setError(getErrorMessage(err, 'Could not enable notifications.'))
      }
    } finally {
      setEnabling(false)
    }
  }

  async function handleTryAgainFromBlocked() {
    if (!user) return
    setEnabling(true)
    try {
      await enablePush(user.id)
      setPushPromptState(user.id, 'completed')
      invalidateProfile()
      setBlockedOpen(false)
    } catch (err) {
      if (!isPushPermissionDeniedError(err)) {
        setBlockedOpen(false)
        setError(getErrorMessage(err, 'Could not enable notifications.'))
      }
    } finally {
      setEnabling(false)
    }
  }

  return (
    <>
      <GlassModal open={open} onClose={dismiss} title="Stay on track with reminders?">
        <div className="flex flex-col gap-5">
          <div className="flex justify-center">
            <div className="size-14 rounded-2xl bg-accent-blue/15 flex items-center justify-center">
              <Bell className="size-7 text-accent-blue" />
            </div>
          </div>

          <p className="text-[15px] text-black/70 dark:text-white/70 text-center leading-relaxed">
            We can send optional push reminders so you don’t miss a streak day, overdue tasks, or a
            timer that’s still running. Only for things you opt into — never ads or marketing.
          </p>

          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
              <CalendarCheck className="size-4 shrink-0 mt-0.5 text-accent-green" />
              <span>Streak reminders at the time you choose</span>
            </li>
            <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
              <ListTodo className="size-4 shrink-0 mt-0.5 text-accent-orange" />
              <span>Todo nudges when something is due or overdue</span>
            </li>
            <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
              <Clock3 className="size-4 shrink-0 mt-0.5 text-accent-indigo" />
              <span>A heads-up if a timer has been running a long time</span>
            </li>
          </ul>

          <p className="text-[12px] text-black/45 dark:text-white/45 text-center">
            If you say yes, your browser or device will ask for permission next. You can also enable
            this later in Settings.
          </p>

          {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}

          <div className="flex flex-col gap-2.5 pt-1">
            <Button size="lg" className="w-full" loading={enabling} onClick={() => void handleYes()}>
              <Bell className="size-4" />
              Yes, enable notifications
            </Button>
            <Button variant="ghost" size="md" className="w-full" onClick={dismiss} disabled={enabling}>
              Later
            </Button>
          </div>
        </div>
      </GlassModal>

      <NotificationBlockedModal
        open={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        onTryAgain={() => void handleTryAgainFromBlocked()}
        tryingAgain={enabling}
      />
    </>
  )
}
