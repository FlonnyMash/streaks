import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { getOAuthAvatarUrl } from '@/lib/profile'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface ProfileAvatarButtonProps {
  className?: string
  size?: 'sm' | 'md'
}

/** Circular nav link to Settings showing the user's avatar — replaces the old text "Settings" link. */
export function ProfileAvatarButton({ className, size = 'md' }: ProfileAvatarButtonProps) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const avatarSrc = profile?.avatar_url ?? getOAuthAvatarUrl(user)

  return (
    <NavLink
      to="/settings"
      aria-label="Open settings"
      className={({ isActive }) =>
        cn(
          'relative flex items-center justify-center rounded-full transition-all shrink-0',
          'ring-2 ring-transparent hover:ring-black/10 dark:hover:ring-white/15 active:scale-95',
          isActive && 'ring-accent-blue/70 hover:ring-accent-blue/70',
          className,
        )
      }
    >
      <Avatar src={avatarSrc} name={profile?.first_name} size={size} />
    </NavLink>
  )
}
