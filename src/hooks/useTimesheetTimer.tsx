import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hapticTick } from '@/lib/haptics'
import { supabase } from '@/lib/supabaseClient'
import { addDaySeconds, liveChunks, type DaySeconds } from '@/lib/todoTimerLogic'
import type { TimesheetSessionDay, TimesheetSessionRow, TimesheetTimerSession } from '@/lib/types'

interface TimesheetSessionDayRow {
  id: string
  user_id: string
  workspace_id: string
  work_date: string
  seconds: number
}

interface TimesheetTimerContextValue {
  sessions: TimesheetTimerSession[]
  days: TimesheetSessionDay[]
  endingSession: TimesheetTimerSession | null
  endDays: DaySeconds[]
  confirmOpen: boolean
  isSyncing: boolean
  elapsedMsFor: (sessionId: string) => number
  storedSecondsFor: (workspaceId: string) => number
  previewDaysFor: (workspaceId: string) => DaySeconds[]
  sessionForWorkspace: (workspaceId: string) => TimesheetTimerSession | null
  start: (workspaceId: string, options?: { topic?: string; startedAt?: Date }) => void
  pause: (workspaceId: string) => Promise<void>
  resume: (workspaceId: string) => Promise<void>
  requestStop: (sessionId: string) => Promise<void>
  cancelStop: () => void
  discard: () => Promise<void>
  clearSession: (workspaceId: string) => Promise<void>
}

const TimesheetTimerContext = createContext<TimesheetTimerContextValue | null>(null)

function storageKey(userId: string) {
  return `timesheet-timers-v2:${userId}`
}

function fromRow(row: TimesheetSessionRow): TimesheetTimerSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runningSince: row.running_since,
    topic: row.topic ?? undefined,
  }
}

function fromDayRow(row: TimesheetSessionDayRow): TimesheetSessionDay {
  return {
    workspaceId: row.workspace_id,
    workDate: row.work_date,
    seconds: row.seconds,
  }
}

function sortSessions(list: TimesheetTimerSession[]): TimesheetTimerSession[] {
  return [...list].sort((a, b) => {
    const aRun = a.runningSince ? new Date(a.runningSince).getTime() : 0
    const bRun = b.runningSince ? new Date(b.runningSince).getTime() : 0
    return bRun - aRun || a.workspaceId.localeCompare(b.workspaceId)
  })
}

function daysToChunks(days: TimesheetSessionDay[], workspaceId: string): DaySeconds[] {
  return days
    .filter((d) => d.workspaceId === workspaceId)
    .map((d) => ({ dateKey: d.workDate, seconds: d.seconds }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

function readCache(userId: string): { sessions: TimesheetTimerSession[]; days: TimesheetSessionDay[] } {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) {
      // Drop legacy clock-in-only caches (shape changed).
      localStorage.removeItem(`timesheet-timers:${userId}`)
      localStorage.removeItem(`timesheet-timer:${userId}`)
      return { sessions: [], days: [] }
    }
    const parsed = JSON.parse(raw) as { sessions?: unknown; days?: unknown }
    const sessions = Array.isArray(parsed.sessions)
      ? sortSessions(
          parsed.sessions.flatMap((item) => {
            const row = item as Partial<TimesheetTimerSession> & { startedAt?: string }
            if (typeof row.id !== 'string' || typeof row.workspaceId !== 'string') return []
            const runningSince =
              row.runningSince === null
                ? null
                : typeof row.runningSince === 'string'
                  ? row.runningSince
                  : typeof row.startedAt === 'string'
                    ? row.startedAt
                    : null
            if (runningSince && Number.isNaN(new Date(runningSince).getTime())) return []
            return [
              {
                id: row.id,
                workspaceId: row.workspaceId,
                runningSince,
                topic: typeof row.topic === 'string' ? row.topic : undefined,
              },
            ]
          }),
        )
      : []
    const days = Array.isArray(parsed.days)
      ? parsed.days.flatMap((item) => {
          const row = item as Partial<TimesheetSessionDay>
          if (typeof row.workspaceId !== 'string' || typeof row.workDate !== 'string') return []
          if (typeof row.seconds !== 'number' || row.seconds < 0) return []
          return [{ workspaceId: row.workspaceId, workDate: row.workDate, seconds: row.seconds }]
        })
      : []
    return { sessions, days }
  } catch {
    return { sessions: [], days: [] }
  }
}

function writeCache(userId: string, sessions: TimesheetTimerSession[], days: TimesheetSessionDay[]) {
  try {
    const key = storageKey(userId)
    if (sessions.length === 0 && days.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify({ sessions, days }))
    localStorage.removeItem(`timesheet-timers:${userId}`)
    localStorage.removeItem(`timesheet-timer:${userId}`)
  } catch {
    // ignore
  }
}

async function fetchServerOffsetMs(): Promise<number> {
  const localBefore = Date.now()
  const nowResult = await supabase.rpc('server_now')
  const localAfter = Date.now()
  if (nowResult.error || !nowResult.data) return 0
  const serverNowMs = new Date(nowResult.data as string).getTime()
  if (!Number.isFinite(serverNowMs)) return 0
  const localMid = localBefore + (localAfter - localBefore) / 2
  return serverNowMs - localMid
}

async function persistDayChunksFallback(userId: string, workspaceId: string, chunks: DaySeconds[]) {
  for (const chunk of chunks) {
    const { data: existing, error: selectError } = await supabase
      .from('timesheet_session_days')
      .select('id, seconds')
      .eq('workspace_id', workspaceId)
      .eq('work_date', chunk.dateKey)
      .maybeSingle()
    if (selectError) throw selectError
    if (existing) {
      const { error } = await supabase
        .from('timesheet_session_days')
        .update({ seconds: (existing.seconds as number) + chunk.seconds })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('timesheet_session_days').insert({
        user_id: userId,
        workspace_id: workspaceId,
        work_date: chunk.dateKey,
        seconds: chunk.seconds,
      })
      if (error) throw error
    }
  }
}

export function TimesheetTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [sessions, setSessions] = useState<TimesheetTimerSession[]>([])
  const [days, setDays] = useState<TimesheetSessionDay[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null)
  const [endDays, setEndDays] = useState<DaySeconds[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const opEpochRef = useRef(0)
  const sessionsRef = useRef(sessions)
  const daysRef = useRef(days)
  sessionsRef.current = sessions
  daysRef.current = days

  const applyState = useCallback(
    (nextSessions: TimesheetTimerSession[], nextDays: TimesheetSessionDay[]) => {
      const sorted = sortSessions(nextSessions)
      sessionsRef.current = sorted
      daysRef.current = nextDays
      setSessions(sorted)
      setDays(nextDays)
      if (userId) writeCache(userId, sorted, nextDays)
    },
    [userId],
  )

  const refreshFromServer = useCallback(async () => {
    if (!userId) {
      applyState([], [])
      setServerOffsetMs(0)
      return
    }
    try {
      const [sessionsResult, daysResult, offset] = await Promise.all([
        supabase.from('timesheet_sessions').select('*').order('created_at', { ascending: true }),
        supabase.from('timesheet_session_days').select('*'),
        fetchServerOffsetMs(),
      ])
      if (sessionsResult.error) throw sessionsResult.error
      if (daysResult.error) throw daysResult.error
      const nextSessions = (sessionsResult.data ?? []).map((row) => fromRow(row as TimesheetSessionRow))
      const nextDays = (daysResult.data ?? []).map((row) => fromDayRow(row as TimesheetSessionDayRow))
      applyState(nextSessions, nextDays)
      setServerOffsetMs(offset)
      setEndingSessionId((id) => (id && !nextSessions.some((s) => s.id === id) ? null : id))
    } catch {
      // Keep cache / current UI if the network blips.
    }
  }, [applyState, userId])

  useEffect(() => {
    setEndingSessionId(null)
    setEndDays([])
    if (!userId) {
      applyState([], [])
      setServerOffsetMs(0)
      return
    }
    const cached = readCache(userId)
    applyState(cached.sessions, cached.days)
    void refreshFromServer()
  }, [userId, refreshFromServer, applyState])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`timesheet-sessions-v2:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timesheet_sessions', filter: `user_id=eq.${userId}` },
        () => {
          void refreshFromServer()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timesheet_session_days', filter: `user_id=eq.${userId}` },
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

  const hasRunning = sessions.some((s) => s.runningSince)
  useEffect(() => {
    if (!hasRunning) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [hasRunning])

  const correctedNow = now + serverOffsetMs

  const elapsedMsFor = useCallback(
    (sessionId: string) => {
      const session = sessionsRef.current.find((s) => s.id === sessionId)
      if (!session) return 0
      const storedMs =
        daysRef.current
          .filter((d) => d.workspaceId === session.workspaceId)
          .reduce((sum, d) => sum + d.seconds, 0) * 1000
      if (!session.runningSince) return storedMs
      const live = correctedNow - new Date(session.runningSince).getTime()
      return storedMs + Math.max(0, live)
    },
    [correctedNow],
  )

  const storedSecondsFor = useCallback(
    (workspaceId: string) =>
      days.filter((d) => d.workspaceId === workspaceId).reduce((sum, d) => sum + d.seconds, 0),
    [days],
  )

  const previewDaysFor = useCallback(
    (workspaceId: string) => {
      const stored = daysToChunks(daysRef.current, workspaceId)
      const session = sessionsRef.current.find((s) => s.workspaceId === workspaceId)
      if (!session?.runningSince) return stored
      const endedAt = new Date(Date.now() + serverOffsetMs)
      return addDaySeconds(stored, liveChunks(new Date(session.runningSince), endedAt))
    },
    [serverOffsetMs],
  )

  const sessionForWorkspace = useCallback(
    (workspaceId: string) => sessions.find((s) => s.workspaceId === workspaceId) ?? null,
    [sessions],
  )

  const pause = useCallback(
    async (workspaceId: string) => {
      if (!userId) return
      const session = sessionsRef.current.find((s) => s.workspaceId === workspaceId)
      if (!session?.runningSince) return
      hapticTick()

      const endedAt = new Date(Date.now() + serverOffsetMs)
      const chunks = liveChunks(new Date(session.runningSince), endedAt)
      const nextDays = addDaySeconds(daysToChunks(daysRef.current, workspaceId), chunks)
      const nextDayRows = nextDays.map((row) => ({
        workspaceId,
        workDate: row.dateKey,
        seconds: row.seconds,
      }))
      const nextSessions = sessionsRef.current.map((s) =>
        s.workspaceId === workspaceId ? { ...s, runningSince: null } : s,
      )
      const nextAllDays = [...daysRef.current.filter((d) => d.workspaceId !== workspaceId), ...nextDayRows]
      applyState(nextSessions, nextAllDays)

      const epoch = ++opEpochRef.current
      setIsSyncing(true)
      try {
        const { error } = await supabase.rpc('pause_timesheet_timer', {
          p_workspace_id: workspaceId,
          p_chunks: chunks,
        })
        if (error) {
          await persistDayChunksFallback(userId, workspaceId, chunks)
          const { data, error: updateError } = await supabase
            .from('timesheet_sessions')
            .update({ running_since: null })
            .eq('workspace_id', workspaceId)
            .select('id')
            .maybeSingle()
          if (updateError) throw updateError
          if (!data) throw error
        }
        if (epoch === opEpochRef.current) await refreshFromServer()
      } catch {
        if (epoch === opEpochRef.current) await refreshFromServer()
      } finally {
        if (epoch === opEpochRef.current) setIsSyncing(false)
      }
    },
    [applyState, refreshFromServer, serverOffsetMs, userId],
  )

  const resume = useCallback(
    async (workspaceId: string) => {
      if (!userId) return
      const session = sessionsRef.current.find((s) => s.workspaceId === workspaceId)
      if (!session || session.runningSince) return
      hapticTick()

      const startedAt = new Date(Date.now() + serverOffsetMs).toISOString()
      const nextSessions = sessionsRef.current.map((s) =>
        s.workspaceId === workspaceId ? { ...s, runningSince: startedAt } : s,
      )
      applyState(nextSessions, daysRef.current)

      const epoch = ++opEpochRef.current
      setIsSyncing(true)
      try {
        const { error } = await supabase
          .from('timesheet_sessions')
          .update({ running_since: startedAt })
          .eq('workspace_id', workspaceId)
        if (error) throw error
      } catch {
        if (epoch === opEpochRef.current) await refreshFromServer()
      } finally {
        if (epoch === opEpochRef.current) setIsSyncing(false)
      }
    },
    [applyState, refreshFromServer, serverOffsetMs, userId],
  )

  const start = useCallback(
    (workspaceId: string, options?: { topic?: string; startedAt?: Date }) => {
      if (!userId) return
      if (sessionsRef.current.some((s) => s.workspaceId === workspaceId)) {
        void resume(workspaceId)
        return
      }
      hapticTick()

      const epoch = ++opEpochRef.current
      const corrected = Date.now() + serverOffsetMs
      let startedAtMs = options?.startedAt ? options.startedAt.getTime() : corrected
      if (!Number.isFinite(startedAtMs)) startedAtMs = corrected
      if (startedAtMs > corrected) startedAtMs = corrected
      const startedAt = new Date(startedAtMs).toISOString()
      const trimmedTopic = options?.topic?.trim() ? options.topic.trim() : undefined
      const optimistic: TimesheetTimerSession = {
        id: `optimistic-${workspaceId}-${Date.now()}`,
        workspaceId,
        runningSince: startedAt,
        topic: trimmedTopic,
      }
      applyState([...sessionsRef.current, optimistic], daysRef.current)
      setIsSyncing(true)

      void (async () => {
        try {
          const { data, error } = await supabase
            .from('timesheet_sessions')
            .insert({
              user_id: userId,
              workspace_id: workspaceId,
              running_since: startedAt,
              topic: trimmedTopic ?? null,
            })
            .select('*')
            .single()

          if (epoch !== opEpochRef.current) {
            if (data?.id) await supabase.from('timesheet_sessions').delete().eq('id', data.id)
            return
          }

          if (error) {
            await refreshFromServer()
            return
          }

          applyState(
            [
              ...sessionsRef.current.filter((s) => s.id !== optimistic.id && s.workspaceId !== workspaceId),
              fromRow(data as TimesheetSessionRow),
            ],
            daysRef.current,
          )
        } catch {
          if (epoch === opEpochRef.current) {
            applyState(
              sessionsRef.current.filter((s) => s.id !== optimistic.id),
              daysRef.current,
            )
          }
        } finally {
          if (epoch === opEpochRef.current) setIsSyncing(false)
        }
      })()
    },
    [applyState, refreshFromServer, resume, serverOffsetMs, userId],
  )

  const clearSession = useCallback(
    async (workspaceId: string) => {
      if (!userId) return
      const ending = sessionsRef.current.find((s) => s.id === endingSessionId)
      applyState(
        sessionsRef.current.filter((s) => s.workspaceId !== workspaceId),
        daysRef.current.filter((d) => d.workspaceId !== workspaceId),
      )
      if (ending?.workspaceId === workspaceId) {
        setEndingSessionId(null)
        setEndDays([])
      }
      const { error: daysError } = await supabase
        .from('timesheet_session_days')
        .delete()
        .eq('workspace_id', workspaceId)
      if (daysError) throw daysError
      const { error: sessionError } = await supabase
        .from('timesheet_sessions')
        .delete()
        .eq('workspace_id', workspaceId)
      if (sessionError) throw sessionError
    },
    [applyState, endingSessionId, userId],
  )

  const requestStop = useCallback(
    async (sessionId: string) => {
      const session = sessionsRef.current.find((s) => s.id === sessionId)
      if (!session) return
      hapticTick()
      if (session.runningSince) await pause(session.workspaceId)
      const preview = daysToChunks(daysRef.current, session.workspaceId)
      setEndDays(preview)
      setEndingSessionId(sessionId)
    },
    [pause],
  )

  const cancelStop = useCallback(() => {
    setEndingSessionId(null)
    setEndDays([])
  }, [])

  const discard = useCallback(async () => {
    const current = sessionsRef.current.find((s) => s.id === endingSessionId) ?? null
    opEpochRef.current += 1
    setEndingSessionId(null)
    setEndDays([])
    if (!current) return
    if (current.id.startsWith('optimistic-')) {
      applyState(
        sessionsRef.current.filter((s) => s.id !== current.id),
        daysRef.current.filter((d) => d.workspaceId !== current.workspaceId),
      )
      return
    }
    setIsSyncing(true)
    try {
      await clearSession(current.workspaceId)
    } catch {
      await refreshFromServer()
    } finally {
      setIsSyncing(false)
    }
  }, [applyState, clearSession, endingSessionId, refreshFromServer])

  const endingSession = useMemo(
    () => sessions.find((s) => s.id === endingSessionId) ?? null,
    [endingSessionId, sessions],
  )

  const value = useMemo<TimesheetTimerContextValue>(
    () => ({
      sessions,
      days,
      endingSession,
      endDays,
      confirmOpen: Boolean(endingSessionId),
      isSyncing,
      elapsedMsFor,
      storedSecondsFor,
      previewDaysFor,
      sessionForWorkspace,
      start,
      pause,
      resume,
      requestStop,
      cancelStop,
      discard,
      clearSession,
    }),
    [
      cancelStop,
      clearSession,
      days,
      discard,
      elapsedMsFor,
      endDays,
      endingSession,
      endingSessionId,
      isSyncing,
      pause,
      previewDaysFor,
      requestStop,
      resume,
      sessionForWorkspace,
      sessions,
      start,
      storedSecondsFor,
    ],
  )

  return <TimesheetTimerContext.Provider value={value}>{children}</TimesheetTimerContext.Provider>
}

export function useTimesheetTimer() {
  const ctx = useContext(TimesheetTimerContext)
  if (!ctx) throw new Error('useTimesheetTimer must be used within a TimesheetTimerProvider')
  return ctx
}
