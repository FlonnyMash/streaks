import { Link } from 'react-router-dom'
import { BrandIcon } from '@/components/BrandIcon'
import { ProfileAvatarButton } from './ProfileAvatarButton'

/** Mobile-only top bar: brand on the left, profile/avatar on the right. Stays fixed while content scrolls. */
export function MobileTopBar() {
  return (
    <header className="sm:hidden fixed inset-x-0 top-0 z-40 safe-top bg-[#f2f2f7]/90 dark:bg-black/90 backdrop-blur-xl">
      <div className="px-4 pb-2 pt-3 flex items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 min-w-0 h-11 rounded-full hover:opacity-80 active:scale-[0.98] transition-all"
        >
          <BrandIcon className="size-8 shrink-0" />
          <h1 className="text-[17px] font-bold tracking-tight leading-tight truncate">
            Mashed Personal Dashboard
          </h1>
        </Link>
        <div className="glass-surface rounded-full size-11 flex items-center justify-center shrink-0 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.3)]">
          <ProfileAvatarButton size="sm" />
        </div>
      </div>
    </header>
  )
}
