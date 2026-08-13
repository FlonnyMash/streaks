import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hapticTick } from '@/lib/haptics'
import { supabase } from '@/lib/supabaseClient'
import { addDaySeconds, splitElapsedByDay, type DaySeconds } from '@/lib/todoTimerLogic'
import type { TodoTimer, TodoTimerDay } from '@/lib/types'

interface TodoTimerRow {
  id: string
  user_id: string
  todo_id: string
  running_since: string | null
  created_at: string
}

interface TodoTimerDayRow {
  id: string
  user_id: string
  todo_id: string
  work_date: string
  seconds: number
}

export type StartTimerResult = { ok: true } | { ok: false; runningTodoId: string }

interface TodoTimerContextValue {
  timers: TodoTimer[]
  days: TodoTimerDay[]
  runningTimer: TodoTimer | null
  isSyncing: boolean
  pendingSwitchTodoId: string | null
  elapsedMsFor: (todoId: string) => number
  storedSecondsFor: (todoId: string) => number
  daysFor: (todoId: string) => DaySeconds[]
  timerFor: (todoId: string) => TodoTimer | null
  requestStart: (todoId: string) => Promise<StartTimerResult>
  confirmSwitch: () => Promise<void>
  cancelSwitch: () => void
  pause: (todoId: string) => Promise<void>
  flush: (todoId: string) => Promise<DaySeconds[]>
  clearTimer: (todoId: string) => Promise<void>
}

const TodoTimerContext = createContext<TodoTimerContextValue | null>(null)

function fromTimerRow(row: TodoTimerRow): TodoTimer {
  return {
    id: row.id,
    todoId: row.todo_id,
    runningSince: row.running_since,
  }
}

function fromDayRow(row: TodoTimerDayRow): TodoTimerDay {
  return {
    todoId: row.todo_id,
    workDate: row.work_date,
    seconds: row.seconds,
  }
}

function daysToChunks(days: TodoTimerDay[], todoId: string): DaySeconds[] {
  return days
    .filter((d) => d.todoId === todoId)
    .map((d) => ({ dateKey: d.workDate, seconds: d.seconds }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
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

async function persistDayChunks(userId: string, todoId: string, chunks: DaySeconds[]) {
  for (const chunk of chunks) {
    const { data: existing, error: selectError } = await supabase
      .from('todo_timer_days')
      .select('id, seconds')
      .eq('todo_id', todoId)
      .eq('work_date', chunk.dateKey)
      .maybeSingle()
    if (selectError) throw selectError
    if (existing) {
      const { error } = await supabase
        .from('todo_timer_days')
        .update({ seconds: (existing.seconds as number) + chunk.seconds })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('todo_timer_days').insert({
        user_id: userId,
        todo_id: todoId,
        work_date: chunk.dateKey,
        seconds: chunk.seconds,
      })
      if (error) throw error
    }
  }
}

export function TodoTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [timers, setTimers] = useState<TodoTimer[]>([])
  const [days, setDays] = useState<TodoTimerDay[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingSwitchTodoId, setPendingSwitchTodoId] = useState<string | null>(null)
  const timersRef = useRef(timers)
  const daysRef = useRef(days)
  timersRef.current = timers
  daysRef.current = days
  const opEpochRef = useRef(0)

  const refreshFromServer = useCallback(async () => {
    if (!userId) {
      setTimers([])
      setDays([])
      setServerOffsetMs(0)
      return
    }
    try {
      const [timersResult, daysResult, offset] = await Promise.all([
        supabase.from('todo_timers').select('*'),
        supabase.from('todo_timer_days').select('*'),
        fetchServerOffsetMs(),
      ])
      if (timersResult.error) throw timersResult.error
      if (daysResult.error) throw daysResult.error
      setTimers((timersResult.data ?? []).map((row) => fromTimerRow(row as TodoTimerRow)))
      setDays((daysResult.data ?? []).map((row) => fromDayRow(row as TodoTimerDayRow)))
      setServerOffsetMs(offset)
    } catch {
      // Keep current UI if the network blips.
    }
  }, [userId])

  useEffect(() => {
    setPendingSwitchTodoId(null)
    if (!userId) {
      setTimers([])
      setDays([])
      setServerOffsetMs(0)
      return
    }
    void refreshFromServer()
  }, [userId, refreshFromServer])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`todo-timers:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todo_timers', filter: `user_id=eq.${userId}` },
        () => {
          void refreshFromServer()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todo_timer_days', filter: `user_id=eq.${userId}` },
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

  const hasRunning = timers.some((t) => t.runningSince)
  useEffect(() => {
    if (!hasRunning) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [hasRunning])

  const correctedNow = now + serverOffsetMs

  const elapsedMsFor = useCallback(
    (todoId: string) => {
      const storedMs = daysRef.current
        .filter((d) => d.todoId === todoId)
        .reduce((sum, d) => sum + d.seconds, 0) * 1000
      const timer = timersRef.current.find((t) => t.todoId === todoId)
      if (!timer?.runningSince) return storedMs
      const live = correctedNow - new Date(timer.runningSince).getTime()
      return storedMs + Math.max(0, live)
    },
    [correctedNow],
  )

  const storedSecondsFor = useCallback(
    (todoId: string) => days.filter((d) => d.todoId === todoId).reduce((sum, d) => sum + d.seconds, 0),
    [days],
  )

  const daysFor = useCallback((todoId: string) => daysToChunks(days, todoId), [days])

  const timerFor = useCallback(
    (todoId: string) => timers.find((t) => t.todoId === todoId) ?? null,
    [timers],
  )

  const runningTimer = useMemo(() => timers.find((t) => t.runningSince) ?? null, [timers])

  const pause = useCallback(
    async (todoId: string) => {
      if (!userId) return
      const timer = timersRef.current.find((t) => t.todoId === todoId)
      if (!timer?.runningSince) return
      hapticTick()

      const endedAt = new Date(Date.now() + serverOffsetMs)
      const chunks = splitElapsedByDay(new Date(timer.runningSince), endedAt)
      const nextDays = addDaySeconds(daysToChunks(daysRef.current, todoId), chunks)
      const nextDayRows = nextDays.map((row) => ({ todoId, workDate: row.dateKey, seconds: row.seconds }))
      const nextTimers = timersRef.current.map((t) => (t.todoId === todoId ? { ...t, runningSince: null } : t))
      const nextAllDays = [...daysRef.current.filter((d) => d.todoId !== todoId), ...nextDayRows]
      timersRef.current = nextTimers
      daysRef.current = nextAllDays
      setTimers(nextTimers)
      setDays(nextAllDays)

      const epoch = ++opEpochRef.current
      setIsSyncing(true)
      try {
        await persistDayChunks(userId, todoId, chunks)
        const { error } = await supabase.from('todo_timers').update({ running_since: null }).eq('id', timer.id)
        if (error) throw error
      } catch {
        if (epoch === opEpochRef.current) await refreshFromServer()
      } finally {
        if (epoch === opEpochRef.current) setIsSyncing(false)
      }
    },
    [refreshFromServer, serverOffsetMs, userId],
  )

  const startInternal = useCallback(
    async (todoId: string) => {
      if (!userId) return
      const existing = timersRef.current.find((t) => t.todoId === todoId)
      if (existing?.runningSince) return
      hapticTick()

      const startedAt = new Date(Date.now() + serverOffsetMs).toISOString()
      const epoch = ++opEpochRef.current
      setIsSyncing(true)

      if (existing) {
        const nextTimers = timersRef.current.map((t) => (t.todoId === todoId ? { ...t, runningSince: startedAt } : t))
        timersRef.current = nextTimers
        setTimers(nextTimers)
        try {
          const { error } = await supabase
            .from('todo_timers')
            .update({ running_since: startedAt })
            .eq('id', existing.id)
          if (error) throw error
        } catch {
          if (epoch === opEpochRef.current) await refreshFromServer()
        } finally {
          if (epoch === opEpochRef.current) setIsSyncing(false)
        }
        return
      }

      const optimistic: TodoTimer = { id: `optimistic-${todoId}`, todoId, runningSince: startedAt }
      const nextTimers = [...timersRef.current.filter((t) => t.todoId !== todoId), optimistic]
      timersRef.current = nextTimers
      setTimers(nextTimers)
      try {
        const { data, error } = await supabase
          .from('todo_timers')
          .insert({ user_id: userId, todo_id: todoId, running_since: startedAt })
          .select('*')
          .single()
        if (error) throw error
        if (epoch !== opEpochRef.current) return
        const confirmed = fromTimerRow(data as TodoTimerRow)
        const next = [
          ...timersRef.current.filter((t) => t.id !== optimistic.id && t.todoId !== todoId),
          confirmed,
        ]
        timersRef.current = next
        setTimers(next)
      } catch {
        if (epoch === opEpochRef.current) {
          const rolledBack = timersRef.current.filter((t) => t.id !== optimistic.id)
          timersRef.current = rolledBack
          setTimers(rolledBack)
          await refreshFromServer()
        }
      } finally {
        if (epoch === opEpochRef.current) setIsSyncing(false)
      }
    },
    [refreshFromServer, serverOffsetMs, userId],
  )

  const requestStart = useCallback(
    async (todoId: string): Promise<StartTimerResult> => {
      const running = timersRef.current.find((t) => t.runningSince)
      if (running && running.todoId !== todoId) {
        setPendingSwitchTodoId(todoId)
        return { ok: false, runningTodoId: running.todoId }
      }
      setPendingSwitchTodoId(null)
      await startInternal(todoId)
      return { ok: true }
    },
    [startInternal],
  )

  const confirmSwitch = useCallback(async () => {
    const nextId = pendingSwitchTodoId
    const running = timersRef.current.find((t) => t.runningSince)
    setPendingSwitchTodoId(null)
    if (!nextId) return
    if (running) await pause(running.todoId)
    await startInternal(nextId)
  }, [pause, pendingSwitchTodoId, startInternal])

  const cancelSwitch = useCallback(() => setPendingSwitchTodoId(null), [])

  const flush = useCallback(
    async (todoId: string) => {
      await pause(todoId)
      return daysToChunks(daysRef.current, todoId)
    },
    [pause],
  )

  const clearTimer = useCallback(
    async (todoId: string) => {
      if (!userId) return
      setPendingSwitchTodoId((id) => (id === todoId ? null : id))
      timersRef.current = timersRef.current.filter((t) => t.todoId !== todoId)
      daysRef.current = daysRef.current.filter((d) => d.todoId !== todoId)
      setTimers(timersRef.current)
      setDays(daysRef.current)
      const { error: daysError } = await supabase.from('todo_timer_days').delete().eq('todo_id', todoId)
      if (daysError) throw daysError
      const { error: timerError } = await supabase.from('todo_timers').delete().eq('todo_id', todoId)
      if (timerError) throw timerError
    },
    [userId],
  )

  const value = useMemo<TodoTimerContextValue>(
    () => ({
      timers,
      days,
      runningTimer,
      isSyncing,
      pendingSwitchTodoId,
      elapsedMsFor,
      storedSecondsFor,
      daysFor,
      timerFor,
      requestStart,
      confirmSwitch,
      cancelSwitch,
      pause,
      flush,
      clearTimer,
    }),
    [
      cancelSwitch,
      clearTimer,
      confirmSwitch,
      days,
      daysFor,
      elapsedMsFor,
      flush,
      isSyncing,
      pause,
      pendingSwitchTodoId,
      requestStart,
      runningTimer,
      storedSecondsFor,
      timerFor,
      timers,
    ],
  )

  return <TodoTimerContext.Provider value={value}>{children}</TodoTimerContext.Provider>
}

export function useTodoTimer() {
  const ctx = useContext(TodoTimerContext)
  if (!ctx) throw new Error('useTodoTimer must be used within a TodoTimerProvider')
  return ctx
}
