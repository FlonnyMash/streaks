import { deleteDB } from 'idb'
import { del, get, set } from 'idb-keyval'

export const OUTBOX_DB_NAME = 'flonny-outbox'
export const AVATAR_CACHE_DB_NAME = 'flonny-avatar-cache'
export const QUERY_PERSIST_KEY = 'flonny-react-query'

const LEGACY_OUTBOX_DB_NAME = 'mashed-outbox'
const LEGACY_AVATAR_CACHE_DB_NAME = 'mashed-avatar-cache'
const LEGACY_QUERY_PERSIST_KEY = 'mashed-react-query'

const MIGRATION_FLAG = 'flonny:legacy-idb-migrated:v1'

let migration: Promise<void> | null = null

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

/** Open `name` only if it already exists. Never leave an empty database behind. */
function openExistingIndexedDb(name: string): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    let created = false
    let settled = false
    const finish = (db: IDBDatabase | null) => {
      if (settled) return
      settled = true
      resolve(db)
    }

    try {
      const request = indexedDB.open(name)
      request.onupgradeneeded = () => {
        created = true
        try {
          request.transaction?.abort()
        } catch {
          // ignore
        }
      }
      request.onsuccess = () => {
        const db = request.result
        if (created) {
          db.close()
          indexedDB.deleteDatabase(name)
          finish(null)
          return
        }
        finish(db)
      }
      request.onerror = () => {
        if (created) {
          try {
            indexedDB.deleteDatabase(name)
          } catch {
            // ignore
          }
        }
        finish(null)
      }
    } catch {
      finish(null)
    }
  })
}

async function copyStoresWithoutOverwrite(oldDb: IDBDatabase, newName: string) {
  const storeNames = Array.from(oldDb.objectStoreNames)
  if (storeNames.length === 0) return

  const schemas = storeNames.map((storeName) => {
    const store = oldDb.transaction(storeName, 'readonly').objectStore(storeName)
    return {
      name: storeName,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement,
      indexes: Array.from(store.indexNames).map((indexName) => {
        const idx = store.index(indexName)
        return {
          name: indexName,
          keyPath: idx.keyPath,
          unique: idx.unique,
          multiEntry: idx.multiEntry,
        }
      }),
    }
  })

  const newDb = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(newName)
    request.onupgradeneeded = () => {
      const dest = request.result
      for (const schema of schemas) {
        if (dest.objectStoreNames.contains(schema.name)) continue
        const newStore = dest.createObjectStore(
          schema.name,
          schema.keyPath === null
            ? { autoIncrement: schema.autoIncrement }
            : { keyPath: schema.keyPath, autoIncrement: schema.autoIncrement },
        )
        for (const idx of schema.indexes) {
          newStore.createIndex(idx.name, idx.keyPath, {
            unique: idx.unique,
            multiEntry: idx.multiEntry,
          })
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error(`Failed to open ${newName}`))
  })

  try {
    for (const storeName of storeNames) {
      if (!newDb.objectStoreNames.contains(storeName)) {
        throw new Error(`Cannot migrate ${storeName}: destination ${newName} is missing that store`)
      }

      const oldTx = oldDb.transaction(storeName, 'readonly')
      const oldStore = oldTx.objectStore(storeName)
      const [records, keys] = await Promise.all([
        idbRequest(oldStore.getAll()),
        idbRequest(oldStore.getAllKeys()),
      ])

      const existingKeyTx = newDb.transaction(storeName, 'readonly')
      const existingKeys = new Set(
        (await idbRequest(existingKeyTx.objectStore(storeName).getAllKeys())).map((key) =>
          JSON.stringify(key),
        ),
      )

      const newTx = newDb.transaction(storeName, 'readwrite')
      const newStore = newTx.objectStore(storeName)
      for (let i = 0; i < records.length; i++) {
        if (existingKeys.has(JSON.stringify(keys[i]))) continue
        newStore.put(records[i])
      }
      await new Promise<void>((resolve, reject) => {
        newTx.oncomplete = () => resolve()
        newTx.onerror = () => reject(newTx.error ?? new Error(`Failed to copy ${storeName}`))
        newTx.onabort = () => reject(newTx.error ?? new Error(`Copy of ${storeName} aborted`))
      })
    }
  } finally {
    newDb.close()
  }
}

async function migrateNamedDatabase(oldName: string, newName: string) {
  const oldDb = await openExistingIndexedDb(oldName)
  if (!oldDb) return

  try {
    await copyStoresWithoutOverwrite(oldDb, newName)
  } finally {
    oldDb.close()
  }

  await deleteDB(oldName)
}

function persistLooksEmpty(value: unknown): boolean {
  if (value == null) return true
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    const queries = parsed?.clientState?.queries
    return !Array.isArray(queries) || queries.length === 0
  } catch {
    return false
  }
}

async function migrateQueryPersistKey() {
  const current = await get(QUERY_PERSIST_KEY)
  if (current != null && !persistLooksEmpty(current)) {
    await del(LEGACY_QUERY_PERSIST_KEY)
    return
  }

  const legacy = await get(LEGACY_QUERY_PERSIST_KEY)
  if (legacy == null) return

  await set(QUERY_PERSIST_KEY, legacy)
  await del(LEGACY_QUERY_PERSIST_KEY)
}

/**
 * Copy mashed-* IndexedDB / persist keys into flonny-* names, then drop the old stores.
 * Safe to call repeatedly; no-ops after a successful run.
 */
export function ensureLegacyBrowserStorageMigrated(): Promise<void> {
  if (!migration) {
    migration = (async () => {
      if (typeof indexedDB === 'undefined') return

      try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem(MIGRATION_FLAG) === '1') {
          return
        }
      } catch {
        // Private mode — still attempt the copy.
      }

      await migrateNamedDatabase(LEGACY_OUTBOX_DB_NAME, OUTBOX_DB_NAME)
      await migrateNamedDatabase(LEGACY_AVATAR_CACHE_DB_NAME, AVATAR_CACHE_DB_NAME)
      await migrateQueryPersistKey()

      try {
        localStorage.setItem(MIGRATION_FLAG, '1')
      } catch {
        // ignore
      }
    })()
    migration.catch(() => {
      migration = null
    })
  }
  return migration
}
