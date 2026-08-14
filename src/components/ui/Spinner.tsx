import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Full-viewport centered spinner for auth / boot gates. */
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f2f2f7] dark:bg-black"
      role="status"
      aria-label="Loading"
    >
      <Loader2 className={cn('size-8 animate-spin text-black/40 dark:text-white/40', className)} />
    </div>
  )
}
