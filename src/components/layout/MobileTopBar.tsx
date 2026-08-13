import { Link } from 'react-router-dom'
import { BrandIcon } from '@/components/BrandIcon'
import { ProfileAvatarButton } from './ProfileAvatarButton'

/** Mobile-only top bar: floating liquid-glass brand + avatar pills. Stays fixed while content scrolls. */
export function MobileTopBar() {
  return (
    <header className="sm:hidden fixed inset-x-0 top-0 z-40 safe-top pointer-events-none">
      <div className="px-3 pt-1.5 flex items-center gap-2 pointer-events-auto">
        <div className="relative flex-1 min-w-0 h-9">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full glass-surface [--glass-blur:80px] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent dark:from-white/16" />
          </div>
          <Link
            to="/dashboard"
            className="relative z-10 h-full pl-2.5 pr-3 flex items-center gap-1.5 min-w-0 rounded-full hover:opacity-80 active:scale-[0.98] transition-all"
          >
            <BrandIcon className="size-5 shrink-0" />
            <h1 className="text-[13px] font-bold tracking-tight leading-none truncate">
              Mashed Personal Dashboard
            </h1>
          </Link>
        </div>
        <div className="relative size-9 shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full glass-surface [--glass-blur:80px] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent dark:from-white/16" />
          </div>
          <div className="relative z-10 size-full flex items-center justify-center">
            <ProfileAvatarButton size="xs" />
          </div>
        </div>
      </div>
    </header>
  )
}
