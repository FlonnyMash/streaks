import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <label className="flex flex-col gap-1.5">
        {label && (
          <span className="text-[13px] font-medium text-black/60 dark:text-white/60 px-0.5">{label}</span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-12 rounded-2xl px-4 text-[16px] outline-none transition-all',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'border border-black/[0.06] dark:border-white/[0.08]',
            'placeholder:text-black/30 dark:placeholder:text-white/30',
            'focus:border-accent-blue focus:bg-white dark:focus:bg-white/[0.08] focus:ring-4 focus:ring-accent-blue/15',
            error && 'border-accent-red focus:border-accent-red focus:ring-accent-red/15',
            className,
          )}
          {...props}
        />
        {error && <span className="text-[13px] text-accent-red px-0.5">{error}</span>}
      </label>
    )
  },
)
TextField.displayName = 'TextField'
