import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { listOutbox, subscribeOutbox, removeOutboxItem, updateOutboxItem } from '@/lib/offline/outbox'
import { isOnline, subscribeOnline } from '@/lib/offline/network'
import {
  flushOutbox,
  resolveConflictKeepLocal,
  resolveConflictUseServer,
  retryFailedItem,
} from '@/lib/offline/flush'
import { OUTBOX_FLUSH_MESSAGE, type PendingMutation } from '@/lib/offline/types'

interface OfflineSyncContextValue {
  online: boolean
  syncing: boolean
  items: PendingMutation[]
  pendingCount: number
  failedCount: number
  conflict: PendingMutation | null
  flush: () => Promise<void>
  keepLocal: (id: string) => Promise<void>
  useServer: (id: string) => Promise<void>
  retry: (id: string) => Promise<void>
  discard: (id: string) => Promise<void>
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null)

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [online, setOnline] = useState(isOnline)
  const [syncing, setSyncing] = useState(false)
  const [items, setItems] = useState<PendingMutation[]>([])

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }
    setItems(await listOutbox(user.id))
  }, [user])

  const flush = useCallback(async () => {
    if (!user || !isOnline()) return
    setSyncing(true)
    try {
      // Re-queue failed items so Retry from the banner actually attempts them again.
      const current = await listOutbox(user.id)
      for (const item of current) {
        if (item.status === 'failed' || item.status === 'conflict') {
          await updateOutboxItem({
            ...item,
            status: 'pending',
            error: undefined,
            serverSnapshot: undefined,
          })
        }
      }
      await flushOutbox(user.id, queryClient)
      await refresh()
    } finally {
      setSyncing(false)
    }
  }, [user, queryClient, refresh])

  useEffect(() => {
    void refresh()
    return subscribeOutbox(() => {
      void refresh()
    })
  }, [refresh])

  useEffect(() => {
    return subscribeOnline(() => {
      setOnline(isOnline())
      if (isOnline()) void flush()
    })
  }, [flush])

  useEffect(() => {
    if (user && online) void flush()
  }, [user?.id, online]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | undefined
      if (data?.type === OUTBOX_FLUSH_MESSAGE) void flush()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [flush])

  const keepLocal = useCallback(
    async (id: string) => {
      if (!user) return
      setSyncing(true)
      try {
        await resolveConflictKeepLocal(id, user.id, queryClient)
        await refresh()
      } finally {
        setSyncing(false)
      }
    },
    [user, queryClient, refresh],
  )

  const useServer = useCallback(
    async (id: string) => {
      if (!user) return
      setSyncing(true)
      try {
        await resolveConflictUseServer(id, user.id, queryClient)
        await refresh()
      } finally {
        setSyncing(false)
      }
    },
    [user, queryClient, refresh],
  )

  const retry = useCallback(
    async (id: string) => {
      if (!user) return
      setSyncing(true)
      try {
        await retryFailedItem(id, user.id, queryClient)
        await refresh()
      } finally {
        setSyncing(false)
      }
    },
    [user, queryClient, refresh],
  )

  const discard = useCallback(
    async (id: string) => {
      await removeOutboxItem(id)
      await refresh()
    },
    [refresh],
  )

  const conflict = items.find((i) => i.status === 'conflict') ?? null
  const pendingCount = items.filter((i) => i.status === 'pending').length
  const failedCount = items.filter((i) => i.status === 'failed').length

  const value = useMemo<OfflineSyncContextValue>(
    () => ({
      online,
      syncing,
      items,
      pendingCount,
      failedCount,
      conflict,
      flush,
      keepLocal,
      useServer,
      retry,
      discard,
    }),
    [
      online,
      syncing,
      items,
      pendingCount,
      failedCount,
      conflict,
      flush,
      keepLocal,
      useServer,
      retry,
      discard,
    ],
  )

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext)
  if (!ctx) throw new Error('useOfflineSync must be used within OfflineSyncProvider')
  return ctx
}
