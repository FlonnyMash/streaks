import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  body,
  children,
  className,
  iconClassName,
}: {
  icon: ReactNode
  title?: string
  body: ReactNode
  children?: ReactNode
  className?: string
  iconClassName?: string
}) {
  return (
    <div
      className={cn(
        'empty-well rounded-2xl flex-1 flex flex-col items-center justify-center text-center gap-2 py-6 px-4 min-h-0',
        className,
      )}
    >
      <div className={cn('empty-well-icon', iconClassName)}>{icon}</div>
      {title ? <h2 className="empty-well-title font-semibold text-lg">{title}</h2> : null}
      <p
        className={cn(
          'max-w-xs',
          title
            ? 'text-[15px] text-black/50 dark:text-white/50'
            : 'text-[13px] text-black/45 dark:text-white/45',
        )}
      >
        {body}
      </p>
      {children}
    </div>
  )
}
