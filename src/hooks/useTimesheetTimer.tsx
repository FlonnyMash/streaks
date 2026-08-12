import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hapticTick } from '@/lib/haptics'
import type { TimesheetTimerSession } from '@/lib/types'

interface TimesheetTimerContextValue {
  session: TimesheetTimerSession | null
  elapsedMs: number
  confirmOpen: boolean
  stoppedAt: Date | null
  start: (workspaceId: string, topic?: string) => void
  requestStop: () => void
  cancelStop: () => void
  discard: () => void
}

const TimesheetTimerContext = createContext<TimesheetTimerContextValue | null>(null)

function storageKey(userId: string) {
  return `timesheet-timer:${userId}`
}

function readSession(userId: string): TimesheetTimerSession | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TimesheetTimerSession>
    if (typeof parsed.workspaceId !== 'string' || typeof parsed.startedAt !== 'string') return null
    if (Number.isNaN(new Date(parsed.startedAt).getTime())) return null
    return {
      workspaceId: parsed.workspaceId,
      startedAt: parsed.startedAt,
      topic: typeof parsed.topic === 'string' ? parsed.topic : undefined,
    }
  } catch {
    return null
  }
}

function writeSession(userId: string, session: TimesheetTimerSession | null) {
  try {
    const key = storageKey(userId)
    if (!session) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(session))
  } catch {
    // ignore unavailable storage
  }
}

export function TimesheetTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [session, setSession] = useState<TimesheetTimerSession | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stoppedAt, setStoppedAt] = useState<Date | null>(null)

  useEffect(() => {
    setConfirmOpen(false)
    setStoppedAt(null)
    setSession(userId ? readSession(userId) : null)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const id = userId
    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey(id)) return
      setSession(readSession(id))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [userId])

  useEffect(() => {
    if (!session || confirmOpen) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [session, confirmOpen])

  const persist = useCallback(
    (next: TimesheetTimerSession | null) => {
      setSession(next)
      if (userId) writeSession(userId, next)
    },
    [userId],
  )

  const start = useCallback(
    (workspaceId: string, topic?: string) => {
      if (!userId || session) return
      hapticTick()
      persist({
        workspaceId,
        startedAt: new Date().toISOString(),
        topic: topic?.trim() ? topic.trim() : undefined,
      })
    },
    [persist, session, userId],
  )

  const requestStop = useCallback(() => {
    if (!session) return
    hapticTick()
    setStoppedAt(new Date())
    setConfirmOpen(true)
  }, [session])

  const cancelStop = useCallback(() => {
    setConfirmOpen(false)
    setStoppedAt(null)
  }, [])

  const discard = useCallback(() => {
    persist(null)
    setConfirmOpen(false)
    setStoppedAt(null)
  }, [persist])

  const elapsedMs = useMemo(() => {
    if (!session) return 0
    const startMs = new Date(session.startedAt).getTime()
    const endMs = confirmOpen && stoppedAt ? stoppedAt.getTime() : now
    return Math.max(0, endMs - startMs)
  }, [confirmOpen, now, session, stoppedAt])

  const value = useMemo<TimesheetTimerContextValue>(
    () => ({
      session,
      elapsedMs,
      confirmOpen,
      stoppedAt,
      start,
      requestStop,
      cancelStop,
      discard,
    }),
    [cancelStop, confirmOpen, discard, elapsedMs, requestStop, session, start, stoppedAt],
  )

  return <TimesheetTimerContext.Provider value={value}>{children}</TimesheetTimerContext.Provider>
}

export function useTimesheetTimer() {
  const ctx = useContext(TimesheetTimerContext)
  if (!ctx) throw new Error('useTimesheetTimer must be used within a TimesheetTimerProvider')
  return ctx
}
