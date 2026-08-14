import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Shown when the signed-in user can’t load their profile (e.g. iOS PWA cold start). */
export function ProfileLoadError({
  message,
  onRetry,
  retrying,
}: {
  message?: string
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-5 safe-top safe-bottom">
      <div className="w-full max-w-sm glass-panel rounded-[28px] p-6 text-center">
        <div className="size-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
          <CloudOff className="size-6 text-black/50 dark:text-white/50" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight mb-1">Can’t reach your account</h1>
        <p className="text-[14px] text-black/60 dark:text-white/60 leading-relaxed mb-4">
          {message ??
            'You’re still signed in, but the profile couldn’t load. Check your connection and try again.'}
        </p>
        <Button size="lg" className="w-full" loading={retrying} onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}
