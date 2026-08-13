import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hapticTick } from '@/lib/haptics'
import { supabase } from '@/lib/supabaseClient'
import type { TimesheetSessionRow, TimesheetTimerSession } from '@/lib/types'

interface TimesheetTimerContextValue {
  sessions: TimesheetTimerSession[]
  stoppingSession: TimesheetTimerSession | null
  stoppedAt: Date | null
  confirmOpen: boolean
  isSyncing: boolean
  elapsedMsFor: (sessionId: string) => number
  sessionForWorkspace: (workspaceId: string) => TimesheetTimerSession | null
  start: (workspaceId: string, options?: { topic?: string; startedAt?: Date }) => void
  requestStop: (sessionId: string) => void
  cancelStop: () => void
  discard: () => Promise<void>
}

const TimesheetTimerContext = createContext<TimesheetTimerContextValue | null>(null)

function storageKey(userId: string) {
  return `timesheet-timers:${userId}`
}

function fromRow(row: TimesheetSessionRow): TimesheetTimerSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    startedAt: row.started_at,
    topic: row.topic ?? undefined,
  }
}

function sortSessions(list: TimesheetTimerSession[]): TimesheetTimerSession[] {
  return [...list].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
}

function readCache(userId: string): TimesheetTimerSession[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) {
      // Migrate legacy single-session cache.
      const legacy = localStorage.getItem(`timesheet-timer:${userId}`)
      if (!legacy) return []
      const one = JSON.parse(legacy) as Partial<TimesheetTimerSession>
      if (typeof one.id === 'string' && typeof one.workspaceId === 'string' && typeof one.startedAt === 'string') {
        return [
          {
            id: one.id,
            workspaceId: one.workspaceId,
            startedAt: one.startedAt,
            topic: typeof one.topic === 'string' ? one.topic : undefined,
          },
        ]
      }
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return sortSessions(
      parsed.flatMap((item) => {
        const row = item as Partial<TimesheetTimerSession>
        if (typeof row.id !== 'string' || typeof row.workspaceId !== 'string' || typeof row.startedAt !== 'string') {
          return []
        }
        if (Number.isNaN(new Date(row.startedAt).getTime())) return []
        return [
          {
            id: row.id,
            workspaceId: row.workspaceId,
            startedAt: row.startedAt,
            topic: typeof row.topic === 'string' ? row.topic : undefined,
          },
        ]
      }),
    )
  } catch {
    return []
  }
}

function writeCache(userId: string, sessions: TimesheetTimerSession[]) {
  try {
    const key = storageKey(userId)
    if (sessions.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(sessions))
    localStorage.removeItem(`timesheet-timer:${userId}`)
  } catch {
    // ignore unavailable storage
  }
}

async function fetchOpenSessions(): Promise<{ sessions: TimesheetTimerSession[]; serverOffsetMs: number }> {
  const localBefore = Date.now()
  const [sessionsResult, nowResult] = await Promise.all([
    supabase.from('timesheet_sessions').select('*').order('started_at', { ascending: true }),
    supabase.rpc('server_now'),
  ])
  const localAfter = Date.now()
  if (sessionsResult.error) throw sessionsResult.error

  const rows = (sessionsResult.data ?? []) as TimesheetSessionRow[]
  let serverOffsetMs = 0
  if (!nowResult.error && nowResult.data) {
    const serverNowMs = new Date(nowResult.data as string).getTime()
    if (Number.isFinite(serverNowMs)) {
      // Approximate RTT midpoint so offset isn't biased by one-way latency.
      const localMid = localBefore + (localAfter - localBefore) / 2
      serverOffsetMs = serverNowMs - localMid
    }
  }

  return {
    sessions: sortSessions(rows.map((row) => fromRow(row))),
    serverOffsetMs,
  }
}

export function TimesheetTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [sessions, setSessions] = useState<TimesheetTimerSession[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [stoppingSessionId, setStoppingSessionId] = useState<string | null>(null)
  const [stoppedAt, setStoppedAt] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const startEpochRef = useRef(0)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  const applySessions = useCallback(
    (next: TimesheetTimerSession[]) => {
      const sorted = sortSessions(next)
      setSessions(sorted)
      if (userId) writeCache(userId, sorted)
    },
    [userId],
  )

  const refreshFromServer = useCallback(async () => {
    if (!userId) {
      applySessions([])
      setServerOffsetMs(0)
      return
    }
    try {
      const remote = await fetchOpenSessions()
      applySessions(remote.sessions)
      setServerOffsetMs(remote.serverOffsetMs)
      setStoppingSessionId((id) => (id && !remote.sessions.some((s) => s.id === id) ? null : id))
    } catch {
      // Keep cache / current UI if the network blips.
    }
  }, [applySessions, userId])

  useEffect(() => {
    setStoppingSessionId(null)
    setStoppedAt(null)
    if (!userId) {
      setSessions([])
      setServerOffsetMs(0)
      return
    }
    setSessions(readCache(userId))
    void refreshFromServer()
  }, [userId, refreshFromServer])

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
        () => {
          void refreshFromServer()
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
  }, [refreshFromServer, userId])

  useEffect(() => {
    if (sessions.length === 0) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [sessions.length])

  const correctedNow = now + serverOffsetMs

  const elapsedMsFor = useCallback(
    (sessionId: string) => {
      const session = sessionsRef.current.find((s) => s.id === sessionId)
      if (!session) return 0
      const startMs = new Date(session.startedAt).getTime()
      if (stoppingSessionId === sessionId && stoppedAt) {
        return Math.max(0, stoppedAt.getTime() - startMs)
      }
      return Math.max(0, correctedNow - startMs)
    },
    [correctedNow, stoppedAt, stoppingSessionId],
  )

  const sessionForWorkspace = useCallback(
    (workspaceId: string) => sessions.find((s) => s.workspaceId === workspaceId) ?? null,
    [sessions],
  )

  const start = useCallback(
    (workspaceId: string, options?: { topic?: string; startedAt?: Date }) => {
      if (!userId || isSyncing) return
      if (sessionsRef.current.some((s) => s.workspaceId === workspaceId)) return
      hapticTick()

      const epoch = ++startEpochRef.current
      const correctedNow = Date.now() + serverOffsetMs
      let startedAtMs = options?.startedAt ? options.startedAt.getTime() : correctedNow
      if (!Number.isFinite(startedAtMs)) startedAtMs = correctedNow
      // Never allow a future start relative to the corrected clock.
      if (startedAtMs > correctedNow) startedAtMs = correctedNow
      const startedAt = new Date(startedAtMs).toISOString()
      const trimmedTopic = options?.topic?.trim() ? options.topic.trim() : undefined
      const optimistic: TimesheetTimerSession = {
        id: `optimistic-${workspaceId}-${Date.now()}`,
        workspaceId,
        startedAt,
        topic: trimmedTopic,
      }
      applySessions([...sessionsRef.current, optimistic])
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
            if (data?.id) await supabase.from('timesheet_sessions').delete().eq('id', data.id)
            return
          }

          if (error) {
            await refreshFromServer()
            return
          }

          applySessions([
            ...sessionsRef.current.filter((s) => s.id !== optimistic.id && s.workspaceId !== workspaceId),
            fromRow(data as TimesheetSessionRow),
          ])
        } catch {
          if (epoch === startEpochRef.current) {
            applySessions(sessionsRef.current.filter((s) => s.id !== optimistic.id))
          }
        } finally {
          if (epoch === startEpochRef.current) setIsSyncing(false)
        }
      })()
    },
    [applySessions, isSyncing, refreshFromServer, serverOffsetMs, userId],
  )

  const requestStop = useCallback((sessionId: string) => {
    if (!sessionsRef.current.some((s) => s.id === sessionId)) return
    hapticTick()
    setStoppingSessionId(sessionId)
    // Freeze using the same corrected clock the live display uses.
    setStoppedAt(new Date(Date.now() + serverOffsetMs))
  }, [serverOffsetMs])

  const cancelStop = useCallback(() => {
    setStoppingSessionId(null)
    setStoppedAt(null)
  }, [])

  const discard = useCallback(async () => {
    const current = sessionsRef.current.find((s) => s.id === stoppingSessionId) ?? null
    startEpochRef.current += 1
    setStoppingSessionId(null)
    setStoppedAt(null)
    if (!current) return

    applySessions(sessionsRef.current.filter((s) => s.id !== current.id))
    if (current.id.startsWith('optimistic-')) return

    setIsSyncing(true)
    try {
      const { error } = await supabase.from('timesheet_sessions').delete().eq('id', current.id)
      if (error) throw error
    } catch {
      await refreshFromServer()
    } finally {
      setIsSyncing(false)
    }
  }, [applySessions, refreshFromServer, stoppingSessionId])

  const stoppingSession = useMemo(
    () => sessions.find((s) => s.id === stoppingSessionId) ?? null,
    [sessions, stoppingSessionId],
  )

  const value = useMemo<TimesheetTimerContextValue>(
    () => ({
      sessions,
      stoppingSession,
      stoppedAt,
      confirmOpen: Boolean(stoppingSessionId),
      isSyncing,
      elapsedMsFor,
      sessionForWorkspace,
      start,
      requestStop,
      cancelStop,
      discard,
    }),
    [
      cancelStop,
      discard,
      elapsedMsFor,
      isSyncing,
      requestStop,
      sessionForWorkspace,
      sessions,
      start,
      stoppedAt,
      stoppingSession,
      stoppingSessionId,
    ],
  )

  return <TimesheetTimerContext.Provider value={value}>{children}</TimesheetTimerContext.Provider>
}

export function useTimesheetTimer() {
  const ctx = useContext(TimesheetTimerContext)
  if (!ctx) throw new Error('useTimesheetTimer must be used within a TimesheetTimerProvider')
  return ctx
}
