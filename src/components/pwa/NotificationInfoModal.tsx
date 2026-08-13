import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'

interface NotificationInfoModalProps {
  open: boolean
  onClose: () => void
  title: string
  body: string
}

/** Simple notice popup for notification setup messages (unsupported, misconfig, errors). */
export function NotificationInfoModal({ open, onClose, title, body }: NotificationInfoModalProps) {
  return (
    <GlassModal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5">
        <p className="text-[15px] text-black/70 dark:text-white/70 leading-relaxed text-center">{body}</p>
        <Button size="lg" className="w-full" onClick={onClose}>
          OK
        </Button>
      </div>
    </GlassModal>
  )
}
