import { ExternalLink, BellOff } from 'lucide-react'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'
import {
  getNotificationBlockedGuidance,
  type NotificationBlockedGuidance,
} from '@/lib/notificationBlocked'

interface NotificationBlockedModalProps {
  open: boolean
  onClose: () => void
  /** After the user fixed settings — re-run enable / refresh. */
  onTryAgain: () => void
  tryingAgain?: boolean
  guidance?: NotificationBlockedGuidance
}

export function NotificationBlockedModal({
  open,
  onClose,
  onTryAgain,
  tryingAgain,
  guidance: guidanceProp,
}: NotificationBlockedModalProps) {
  const guidance = guidanceProp ?? getNotificationBlockedGuidance()

  function openSettingsLink() {
    if (!guidance.settingsHref) return
    try {
      window.open(guidance.settingsHref, '_blank', 'noopener,noreferrer')
    } catch {
      // Some browsers block custom schemes; steps above still apply.
    }
  }

  return (
    <GlassModal open={open} onClose={onClose} title={guidance.title}>
      <div className="flex flex-col gap-5">
        <div className="flex justify-center">
          <div className="size-14 rounded-2xl bg-accent-orange/15 flex items-center justify-center">
            <BellOff className="size-7 text-accent-orange" />
          </div>
        </div>

        <p className="text-[15px] text-black/70 dark:text-white/70 text-center leading-relaxed">
          {guidance.summary}
        </p>

        <ol className="flex flex-col gap-2.5 list-decimal list-inside text-[14px] text-black/65 dark:text-white/65">
          {guidance.steps.map((step) => (
            <li key={step} className="leading-snug">
              {step}
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2.5 pt-1">
          {guidance.settingsHref && guidance.settingsLabel && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={openSettingsLink}
            >
              <ExternalLink className="size-4" />
              {guidance.settingsLabel}
            </Button>
          )}
          <Button size="lg" className="w-full" loading={tryingAgain} onClick={onTryAgain}>
            Try again
          </Button>
          <Button variant="ghost" size="md" className="w-full" onClick={onClose} disabled={tryingAgain}>
            Close
          </Button>
        </div>

        <p className="text-[12px] text-black/40 dark:text-white/40 text-center">
          Browsers often block a direct jump into site permissions — if the settings button doesn’t
          open the right screen, follow the steps above in your {guidance.surfaceLabel} settings.
        </p>
      </div>
    </GlassModal>
  )
}
