import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  className?: string
}

export function Switch({ checked, onChange, label, description, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('w-full flex items-center justify-between gap-3 text-left', className)}
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[14px] font-medium">{label}</span>}
          {description && (
            <span className="block text-[12px] text-black/45 dark:text-white/45 mt-0.5">{description}</span>
          )}
        </span>
      )}
      <span
        className={cn(
          'relative shrink-0 w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-accent-blue' : 'bg-black/15 dark:bg-white/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
