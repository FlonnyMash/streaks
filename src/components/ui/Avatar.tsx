import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCachedAvatarSrc } from '@/hooks/useCachedAvatarSrc'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: AvatarSize
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-8 text-[12px]',
  md: 'size-10 text-[14px]',
  lg: 'size-16 text-[22px]',
  xl: 'size-20 text-[28px]',
}

const iconSizeClasses: Record<AvatarSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-7',
  xl: 'size-9',
}

function initialsFor(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 1).toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const cachedSrc = useCachedAvatarSrc(src)
  const [imageFailed, setImageFailed] = useState(false)
  const initials = initialsFor(name)
  const showImage = Boolean(cachedSrc) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
  }, [cachedSrc])

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden shrink-0 flex items-center justify-center',
        'bg-accent-blue/15 text-accent-blue font-semibold',
        sizeClasses[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={cachedSrc as string}
          alt={name ? `${name}'s avatar` : 'Profile avatar'}
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <UserRound className={iconSizeClasses[size]} />
      )}
    </div>
  )
}
