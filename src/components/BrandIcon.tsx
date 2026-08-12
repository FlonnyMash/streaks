import brandIconBlack from '@/assets/brand-icon-black.png'
import brandIconWhite from '@/assets/brand-icon-white.png'
import { cn } from '@/lib/utils'

interface BrandIconProps {
  className?: string
  title?: string
}

/** App mark — black artwork in light mode, white artwork in dark mode. */
export function BrandIcon({ className, title }: BrandIconProps) {
  return (
    <>
      <img
        src={brandIconBlack}
        alt={title ?? ''}
        aria-hidden={title ? undefined : true}
        className={cn('shrink-0 dark:hidden', className)}
        draggable={false}
      />
      <img
        src={brandIconWhite}
        alt={title ?? ''}
        aria-hidden={title ? undefined : true}
        className={cn('shrink-0 hidden dark:block', className)}
        draggable={false}
      />
    </>
  )
}
