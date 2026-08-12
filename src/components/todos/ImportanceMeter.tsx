import { cn } from '@/lib/utils'
import type { TodoImportance } from '@/lib/types'

export const IMPORTANCE_OPTIONS: Array<{ value: TodoImportance; label: string }> = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
]

const BAR_COLORS = {
  1: 'bg-black/25 dark:bg-white/30',
  2: 'bg-accent-orange',
  3: 'bg-accent-red',
} as const

interface ImportanceMeterProps {
  value: TodoImportance
  onChange?: (value: TodoImportance) => void
  size?: 'sm' | 'md'
  className?: string
}

/** Compact 3-bar importance meter. Interactive when `onChange` is provided. */
export function ImportanceMeter({ value, onChange, size = 'md', className }: ImportanceMeterProps) {
  const interactive = Boolean(onChange)
  const barH = size === 'sm' ? 'h-2' : 'h-3'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'

  return (
    <div
      className={cn('inline-flex items-end', gap, className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Importance: ${IMPORTANCE_OPTIONS.find((o) => o.value === value)?.label ?? value}`}
    >
      {([1, 2, 3] as TodoImportance[]).map((level) => {
        const filled = level <= value
        const color = BAR_COLORS[level]
        const bar = (
          <span
            className={cn(
              'w-1.5 rounded-sm transition-colors',
              barH,
              level === 2 && (size === 'sm' ? 'h-2.5' : 'h-4'),
              level === 3 && (size === 'sm' ? 'h-3.5' : 'h-5'),
              filled ? color : 'bg-black/10 dark:bg-white/12',
            )}
          />
        )

        if (!interactive) return <span key={level}>{bar}</span>

        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            aria-label={IMPORTANCE_OPTIONS.find((o) => o.value === level)?.label}
            onClick={() => onChange?.(level)}
            className="p-0.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-all"
          >
            {bar}
          </button>
        )
      })}
    </div>
  )
}
