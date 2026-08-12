import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hapticTick } from '@/lib/haptics'
import { supabase } from '@/lib/supabaseClient'
import type { TimesheetSessionRow, TimesheetTimerSession } from '@/lib/types'

interface TimesheetTimerContextValue {
  session: TimesheetTimerSession | null
  elapsedMs: number
  confirmOpen: boolean
  stoppedAt: Date | null
  isSyncing: boolean
  start: (workspaceId: string, topic?: string) => void
  requestStop: () => void
  cancelStop: () => void
  discard: () => Promise<void>
}

const TimesheetTimerContext = createContext<TimesheetTimerContextValue | null>(null)

function storageKey(userId: string) {
  return `timesheet-timer:${userId}`
}

function fromRow(row: TimesheetSessionRow): TimesheetTimerSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    startedAt: row.started_at,
    topic: row.topic ?? undefined,
  }
}

function readCache(userId: string): TimesheetTimerSession | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TimesheetTimerSession>
    if (typeof parsed.id !== 'string' || typeof parsed.workspaceId !== 'string' || typeof parsed.startedAt !== 'string') {
      return null
    }
    if (Number.isNaN(new Date(parsed.startedAt).getTime())) return null
    return {
      id: parsed.id,
      workspaceId: parsed.workspaceId,
      startedAt: parsed.startedAt,
      topic: typeof parsed.topic === 'string' ? parsed.topic : undefined,
    }
  } catch {
    return null
  }
}

function writeCache(userId: string, session: TimesheetTimerSession | null) {
  try {
    const key = storageKey(userId)
    if (!session) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(session))
  } catch {
    // ignore unavailable storage
  }
}

async function fetchOpenSession(): Promise<TimesheetTimerSession | null> {
  const { data, error } = await supabase.from('timesheet_sessions').select('*').maybeSingle()
  if (error) throw error
  if (!data) return null
  return fromRow(data as TimesheetSessionRow)
}

export function TimesheetTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [session, setSession] = useState<TimesheetTimerSession | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stoppedAt, setStoppedAt] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const startEpochRef = useRef(0)

  const applySession = useCallback(
    (next: TimesheetTimerSession | null) => {
      setSession(next)
      if (userId) writeCache(userId, next)
      if (!next) {
        setConfirmOpen(false)
        setStoppedAt(null)
      }
    },
    [userId],
  )

  const refreshFromServer = useCallback(async () => {
    if (!userId) {
      applySession(null)
      return
    }
    try {
      const remote = await fetchOpenSession()
      applySession(remote)
    } catch {
      // Keep cache / current UI if the network blips.
    }
  }, [applySession, userId])

  // Hydrate from cache immediately, then reconcile with Supabase.
  useEffect(() => {
    setConfirmOpen(false)
    setStoppedAt(null)
    if (!userId) {
      setSession(null)
      return
    }
    setSession(readCache(userId))
    void refreshFromServer()
  }, [userId, refreshFromServer])

  // Realtime + focus/visibility so other devices stay in sync.
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`timesheet-sessions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timesheet_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            applySession(null)
            return
          }
          const row = (payload.new ?? null) as TimesheetSessionRow | null
          if (row?.id) applySession(fromRow(row))
          else void refreshFromServer()
        },
      )
      .subscribe()

    function onVisible() {
      if (document.visibilityState === 'visible') void refreshFromServer()
    }
    function onFocus() {
      void refreshFromServer()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [applySession, refreshFromServer, userId])

  useEffect(() => {
    if (!session || confirmOpen) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [session, confirmOpen])

  const start = useCallback(
    (workspaceId: string, topic?: string) => {
      if (!userId || session || isSyncing) return
      hapticTick()

      const epoch = ++startEpochRef.current
      const startedAt = new Date().toISOString()
      const trimmedTopic = topic?.trim() ? topic.trim() : undefined
      const optimistic: TimesheetTimerSession = {
        id: `optimistic-${Date.now()}`,
        workspaceId,
        startedAt,
        topic: trimmedTopic,
      }
      applySession(optimistic)
      setIsSyncing(true)

      void (async () => {
        try {
          const { data, error } = await supabase
            .from('timesheet_sessions')
            .insert({
              user_id: userId,
              workspace_id: workspaceId,
              started_at: startedAt,
              topic: trimmedTopic ?? null,
            })
            .select('*')
            .single()

          if (epoch !== startEpochRef.current) {
            // User discarded (or restarted) while insert was in flight — drop the row we just created.
            if (data?.id) {
              await supabase.from('timesheet_sessions').delete().eq('id', data.id)
            }
            return
          }

          if (error) {
            // Another device may already own the single slot — adopt that session.
            const remote = await fetchOpenSession().catch(() => null)
            if (epoch === startEpochRef.current) applySession(remote)
            return
          }

          applySession(fromRow(data as TimesheetSessionRow))
        } catch {
          if (epoch === startEpochRef.current) applySession(null)
        } finally {
          if (epoch === startEpochRef.current) setIsSyncing(false)
        }
      })()
    },
    [applySession, isSyncing, session, userId],
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

  const discard = useCallback(async () => {
    const current = session
    startEpochRef.current += 1
    applySession(null)
    if (!current || current.id.startsWith('optimistic-')) return

    setIsSyncing(true)
    try {
      const { error } = await supabase.from('timesheet_sessions').delete().eq('id', current.id)
      if (error) throw error
    } catch {
      // If delete failed, re-sync so the timer can resurface instead of lying about being gone.
      await refreshFromServer()
    } finally {
      setIsSyncing(false)
    }
  }, [applySession, refreshFromServer, session])

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
      isSyncing,
      start,
      requestStop,
      cancelStop,
      discard,
    }),
    [cancelStop, confirmOpen, discard, elapsedMs, isSyncing, requestStop, session, start, stoppedAt],
  )

  return <TimesheetTimerContext.Provider value={value}>{children}</TimesheetTimerContext.Provider>
}

export function useTimesheetTimer() {
  const ctx = useContext(TimesheetTimerContext)
  if (!ctx) throw new Error('useTimesheetTimer must be used within a TimesheetTimerProvider')
  return ctx
}
