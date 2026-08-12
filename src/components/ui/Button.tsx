import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'glass' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent-blue text-white shadow-[0_8px_20px_-6px_rgba(10,132,255,0.6)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-black/5 dark:bg-white/10 text-current hover:bg-black/10 dark:hover:bg-white/15',
  glass: 'glass-panel text-current hover:brightness-105 active:brightness-95',
  ghost: 'bg-transparent text-current hover:bg-black/5 dark:hover:bg-white/10',
  danger: 'bg-accent-red text-white hover:brightness-110 active:brightness-95',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-13 px-6 text-base gap-2 rounded-2xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 select-none',
          'disabled:opacity-50 disabled:pointer-events-none',
          'active:scale-[0.97]',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
