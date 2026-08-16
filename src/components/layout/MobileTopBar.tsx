import { Link } from 'react-router-dom'
import { BrandIcon } from '@/components/BrandIcon'
import { ProfileAvatarButton } from './ProfileAvatarButton'
import { SyncStatusButton } from '@/components/sync/SyncStatusButton'

/** Mobile-only top bar: brand on the left, sync + profile on the right. Stays fixed while content scrolls. */
export function MobileTopBar() {
  return (
    <header className="app-desktop:hidden fixed inset-x-0 top-0 z-40 safe-top bg-[#f2f2f7]/90 dark:bg-black/90 backdrop-blur-xl">
      <div className="px-4 py-1.5 flex items-center justify-between gap-2.5">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 min-w-0 h-9 rounded-full hover:opacity-80 active:scale-[0.98] transition-all"
        >
          <BrandIcon className="size-7 shrink-0" />
          <h1 className="text-[15px] font-bold tracking-tight leading-tight truncate">
            Mashed Personal Dashboard
          </h1>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <SyncStatusButton size="sm" />
          <div className="glass-surface rounded-full size-9 flex items-center justify-center shadow-[0_8px_20px_-10px_rgba(0,0,0,0.3)]">
            <ProfileAvatarButton size="sm" />
          </div>
        </div>
      </div>
    </header>
  )
}
