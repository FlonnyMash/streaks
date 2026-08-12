import { BrandIcon } from '@/components/BrandIcon'
import { ProfileAvatarButton } from './ProfileAvatarButton'

/** Mobile-only top bar: brand on the left, profile/avatar on the right. */
export function MobileTopBar() {
  return (
    <div className="sm:hidden fixed inset-x-0 top-0 z-40 safe-top">
      <div className="pt-3 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 h-11">
          <BrandIcon className="size-8 shrink-0" />
          <h1 className="text-[17px] font-bold tracking-tight leading-tight truncate">
            Mashed Personal Dashboard
          </h1>
        </div>
        <div className="glass-surface rounded-full size-11 flex items-center justify-center shrink-0 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.3)]">
          <ProfileAvatarButton size="sm" />
        </div>
      </div>
    </div>
  )
}
