import brandIcon from '@/assets/brand-icon.png'
import { cn } from '@/lib/utils'

interface BrandIconProps {
  className?: string
  title?: string
}

/** App mark — white silhouette, inverted for light mode. */
export function BrandIcon({ className, title }: BrandIconProps) {
  return (
    <img
      src={brandIcon}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0 invert dark:invert-0', className)}
      draggable={false}
    />
  )
}
