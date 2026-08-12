import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center w-full h-full py-10">
      <Loader2 className={cn('size-6 animate-spin text-black/40 dark:text-white/40', className)} />
    </div>
  )
}
