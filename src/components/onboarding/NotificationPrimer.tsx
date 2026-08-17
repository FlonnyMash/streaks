import { useEffect, useState } from 'react'
import { Bell, CalendarCheck, Clock3, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NotificationBlockedModal } from '@/components/pwa/NotificationBlockedModal'
import { useInvalidateProfile } from '@/hooks/useProfile'
import { enablePush, getNotificationPermission, isPushSupported } from '@/lib/push'
import { isPushPermissionDeniedError } from '@/lib/notificationBlocked'
import { setPushPromptState } from '@/lib/pushPrompt'
import { getErrorMessage } from '@/lib/errors'

interface NotificationPrimerProps {
  userId: string
  /** Called once the user has made a choice (enabled, skipped, or unsupported). */
  onContinue: () => void
}

/**
 * Onboarding's smart-notification step. Explains reminders before requesting the actual browser
 * permission, then marks the standalone `PushSetupPrompt` (in AppShell) as settled either way so
 * it never re-prompts for users who go through the tour.
 */
export function NotificationPrimer({ userId, onContinue }: NotificationPrimerProps) {
  const invalidateProfile = useInvalidateProfile()
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockedOpen, setBlockedOpen] = useState(false)

  const supported = isPushSupported() && Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  const alreadyDecided = getNotificationPermission() !== 'default'

  // Silently settle the standalone PushSetupPrompt's state for cases this step can't act on
  // interactively (unsupported device, or permission already granted/denied elsewhere).
  useEffect(() => {
    if (!supported) {
      setPushPromptState(userId, 'dismissed')
      return
    }
    if (!alreadyDecided) return
    const permission = getNotificationPermission()
    if (permission === 'granted') {
      void enablePush(userId)
        .then(() => {
          setPushPromptState(userId, 'completed')
          invalidateProfile()
        })
        .catch(() => setPushPromptState(userId, 'dismissed'))
    } else {
      setPushPromptState(userId, 'dismissed')
    }
    // Only needs to run once when this step mounts.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEnable() {
    setError(null)
    setEnabling(true)
    try {
      await enablePush(userId)
      setPushPromptState(userId, 'completed')
      invalidateProfile()
      onContinue()
    } catch (err) {
      setPushPromptState(userId, 'dismissed')
      if (isPushPermissionDeniedError(err)) {
        setBlockedOpen(true)
      } else {
        setError(getErrorMessage(err, 'Could not enable notifications.'))
      }
    } finally {
      setEnabling(false)
    }
  }

  function handleSkip() {
    setPushPromptState(userId, 'dismissed')
    onContinue()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center">
        <div className="size-14 rounded-2xl bg-accent-blue/15 flex items-center justify-center">
          <Bell className="size-7 text-accent-blue" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">Smart reminders, on your terms</h2>
        <p className="text-black/60 dark:text-white/60 text-[14px] mt-2 leading-relaxed">
          We can send optional push reminders so you don't miss a routine task, a streak day, or a
          timer that's still running. Only for things you opt into — never ads or marketing.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
          <CalendarCheck className="size-4 shrink-0 mt-0.5 text-accent-green" />
          <span>Streak reminders at the time you choose</span>
        </li>
        <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
          <ListTodo className="size-4 shrink-0 mt-0.5 text-accent-orange" />
          <span>Gentle nudges for tasks in today's routine</span>
        </li>
        <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
          <Clock3 className="size-4 shrink-0 mt-0.5 text-accent-indigo" />
          <span>A heads-up if a timer has been running a long time</span>
        </li>
      </ul>

      {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}

      {supported && !alreadyDecided ? (
        <div className="flex flex-col gap-2.5 pt-1">
          <Button size="lg" className="w-full" loading={enabling} onClick={() => void handleEnable()}>
            <Bell className="size-4" />
            Enable notifications
          </Button>
          <Button variant="ghost" size="md" className="w-full" onClick={handleSkip} disabled={enabling}>
            Not now
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[12px] text-black/40 dark:text-white/40 text-center">
            {supported
              ? 'You have already decided on notifications for this device. You can change this anytime in Settings.'
              : 'Notifications aren\u2019t available on this device/browser yet. You can turn them on later from Settings.'}
          </p>
          <Button size="lg" className="w-full" onClick={onContinue}>
            Continue
          </Button>
        </div>
      )}

      <NotificationBlockedModal
        open={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        onTryAgain={() => void handleEnable()}
        tryingAgain={enabling}
      />
    </div>
  )
}
