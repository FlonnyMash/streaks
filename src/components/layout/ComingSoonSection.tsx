import type { LucideIcon } from 'lucide-react'

interface ComingSoonSectionProps {
  icon: LucideIcon
  title: string
  description: string
}

/** Placeholder empty-state for hub sections that aren't built yet (see the phased rollout plan). */
export function ComingSoonSection({ icon: Icon, title, description }: ComingSoonSectionProps) {
  return (
    <div className="glass-panel rounded-[28px] p-10 flex flex-col items-center text-center gap-3 mt-6">
      <Icon className="size-8 text-accent-orange" />
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-black/50 dark:text-white/50 text-[15px] max-w-xs">{description}</p>
      <span className="mt-2 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[12px] font-medium text-black/50 dark:text-white/50">
        Coming soon
      </span>
    </div>
  )
}
