import { Link } from 'react-router-dom'
import { BrandIcon } from '@/components/BrandIcon'
import { ProfileAvatarButton } from './ProfileAvatarButton'

/** Mobile-only top bar: brand and avatar as separate liquid-glass pills. Fixed while content scrolls. */
export function MobileTopBar() {
  return (
    <header className="sm:hidden fixed inset-x-0 top-0 z-40 safe-top pointer-events-none">
      <div className="px-3 pt-3 flex items-center justify-between gap-3 pointer-events-auto">
        <div className="relative min-w-0 h-11">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full glass-surface shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent dark:from-white/16" />
          </div>
          <Link
            to="/dashboard"
            className="relative z-10 flex items-center gap-2.5 min-w-0 h-full pl-3 pr-4 rounded-full hover:opacity-80 active:scale-[0.98] transition-all"
          >
            <BrandIcon className="size-7 shrink-0" />
            <h1 className="text-[15px] font-bold tracking-tight leading-tight truncate">
              Mashed Personal Dashboard
            </h1>
          </Link>
        </div>

        <div className="relative size-11 shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full glass-surface shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent dark:from-white/16" />
          </div>
          <div className="relative z-10 size-full flex items-center justify-center">
            <ProfileAvatarButton size="sm" />
          </div>
        </div>
      </div>
    </header>
  )
}
