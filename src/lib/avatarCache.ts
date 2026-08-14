import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface AvatarCacheDb extends DBSchema {
  blobs: {
    key: string
    value: { url: string; blob: Blob; cachedAt: number }
  }
}

const DB_NAME = 'mashed-avatar-cache'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<AvatarCacheDb>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AvatarCacheDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('blobs', { keyPath: 'url' })
      },
    })
  }
  return dbPromise
}

export async function readCachedAvatarBlob(url: string): Promise<Blob | null> {
  try {
    const db = await getDb()
    const row = await db.get('blobs', url)
    return row?.blob ?? null
  } catch {
    return null
  }
}

export async function writeCachedAvatarBlob(url: string, blob: Blob): Promise<void> {
  try {
    const db = await getDb()
    await db.put('blobs', { url, blob, cachedAt: Date.now() })
  } catch {
    // Quota / private mode — ignore; network URL still works online.
  }
}

export async function deleteCachedAvatar(url: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete('blobs', url)
  } catch {
    // ignore
  }
}

/** Fetch remote avatar and store it for offline use. Returns the blob when successful. */
export async function warmAvatarCache(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'force-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/') && blob.size === 0) return null
    await writeCachedAvatarBlob(url, blob)
    return blob
  } catch {
    return null
  }
}
