import { ProfileAvatarButton } from './ProfileAvatarButton'

/** Mobile-only top-right profile/avatar icon — replaces the "Settings" tab removed from the bottom bar. */
export function MobileTopBar() {
  return (
    <div className="sm:hidden fixed top-0 right-0 z-40 safe-top">
      <div className="pt-3 pr-4">
        <div className="glass-surface rounded-full size-11 flex items-center justify-center shadow-[0_8px_20px_-10px_rgba(0,0,0,0.3)]">
          <ProfileAvatarButton size="sm" />
        </div>
      </div>
    </div>
  )
}
