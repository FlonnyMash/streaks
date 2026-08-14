import { useEffect, useState } from 'react'
import { readCachedAvatarBlob, warmAvatarCache } from '@/lib/avatarCache'

/**
 * Resolves a remote avatar URL to a local blob: URL when cached,
 * so the picture still renders offline after it was seen online once.
 */
export function useCachedAvatarSrc(remoteUrl: string | null | undefined): string | null {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!remoteUrl) {
      setDisplayUrl(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    const online = typeof navigator === 'undefined' ? true : navigator.onLine

    const revoke = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    }

    void (async () => {
      const cached = await readCachedAvatarBlob(remoteUrl)
      if (cancelled) return

      if (cached) {
        revoke()
        objectUrl = URL.createObjectURL(cached)
        setDisplayUrl(objectUrl)
      } else if (online) {
        // No cache yet — show network URL while we warm the store.
        setDisplayUrl(remoteUrl)
      } else {
        setDisplayUrl(null)
      }

      if (!online) return

      const fresh = await warmAvatarCache(remoteUrl)
      if (cancelled || !fresh) return
      revoke()
      objectUrl = URL.createObjectURL(fresh)
      setDisplayUrl(objectUrl)
    })()

    return () => {
      cancelled = true
      revoke()
    }
  }, [remoteUrl])

  return displayUrl
}
