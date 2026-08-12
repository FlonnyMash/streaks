import brandIcon from '@/assets/brand-icon.png'
import { cn } from '@/lib/utils'

interface BrandIconProps {
  className?: string
  title?: string
}

/** App mark — color via `currentColor` / Tailwind text classes (light & dark). */
export function BrandIcon({ className, title }: BrandIconProps) {
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        maskImage: `url(${brandIcon})`,
        WebkitMaskImage: `url(${brandIcon})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}
