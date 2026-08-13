/**
 * push-dispatch — Web Push sender for Mashed Personal Dashboard.
 *
 * Auth: Authorization: Bearer <PUSH_DISPATCH_SECRET>
 *
 * Modes:
 *   { "mode": "cron" }
 *   { "mode": "manual", "title": "...", "body": "...", "user_id"?: "...", "url"?: "..." }
 *
 * Secrets: PUSH_DISPATCH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * Builtin: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type PushKind = 'streak_reminder' | 'todo_overdue' | 'timer_nudge' | 'manual'

interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface ProfileRow {
  user_id: string
  push_enabled: boolean
  timezone: string | null
}

interface StreakRow {
  id: string
  user_id: string
  name: string
  emoji: string
  frequency_type: 'daily' | 'weekdays' | 'times_per_week'
  target_weekdays: number[] | null
  target_count: number | null
  notify_enabled: boolean
  notify_time: string | null
  archived: boolean
}

interface TodoRow {
  id: string
  user_id: string
  title: string
  due_date: string
  notify_enabled: boolean
  done: boolean
  archived: boolean
}

interface TimerRow {
  id: string
  user_id: string
  running_since: string
  label: string
  url: string
}

interface Payload {
  title: string
  body: string
  url?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

function authOk(req: Request): boolean {
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET')
  if (!secret) return false
  const header = req.headers.get('Authorization') ?? ''
  return header === `Bearer ${secret}`
}

/** Local calendar parts in an IANA timezone. */
function localParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]))
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    minutesOfDay: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: weekdayMap[parts.weekday!] ?? 0,
  }
}

function parseNotifyMinutes(notifyTime: string): number {
  // Postgres time may be "HH:MM:SS" or "HH:MM:SS.mmm"
  const [h, m] = notifyTime.split(':').map((x) => Number(x))
  return (h || 0) * 60 + (m || 0)
}

function withinNotifyWindow(nowMinutes: number, targetMinutes: number, windowHalf = 7): boolean {
  // Cron every 15m → ±7 minutes covers each slot once.
  const diff = Math.abs(nowMinutes - targetMinutes)
  return diff <= windowHalf || diff >= 24 * 60 - windowHalf
}

function startOfWeekMonday(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const day = utc.getUTCDay() // 0=Sun
  const offset = day === 0 ? -6 : 1 - day
  utc.setUTCDate(utc.getUTCDate() + offset)
  return utc.toISOString().slice(0, 10)
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return utc.toISOString().slice(0, 10)
}

function isStreakDueToday(streak: StreakRow, local: ReturnType<typeof localParts>, completedThisWeek: number, completedToday: boolean): boolean {
  if (completedToday) return false
  if (streak.frequency_type === 'weekdays') {
    const targets = streak.target_weekdays ?? []
    if (targets.length === 0) return true
    return targets.includes(local.weekday)
  }
  if (streak.frequency_type === 'times_per_week') {
    const target = streak.target_count ?? 1
    return completedThisWeek < target
  }
  return true // daily
}

function configureWebPush() {
  webpush.setVapidDetails(
    requireEnv('VAPID_SUBJECT'),
    requireEnv('VAPID_PUBLIC_KEY'),
    requireEnv('VAPID_PRIVATE_KEY'),
  )
}

async function claimDelivery(
  supabase: SupabaseClient,
  userId: string,
  kind: PushKind,
  entityId: string | null,
  bucket: string,
): Promise<boolean> {
  const { error } = await supabase.from('push_delivery_log').insert({
    user_id: userId,
    kind,
    entity_id: entityId,
    bucket,
  })
  if (error) {
    // unique violation → already sent
    if (error.code === '23505') return false
    console.error('claimDelivery failed', error)
    return false
  }
  return true
}

async function sendToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: Payload,
  subsByUser: Map<string, PushSubscriptionRow[]>,
): Promise<{ sent: number; removed: number }> {
  const subs = subsByUser.get(userId) ?? []
  let sent = 0
  let removed = 0
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  })

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 60 * 60 * 12, urgency: 'normal' },
      )
      sent++
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        removed++
      } else {
        console.error('webpush failed', sub.id, err)
      }
    }
  }
  return { sent, removed }
}

async function runCron(supabase: SupabaseClient) {
  const now = new Date()
  configureWebPush()

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, push_enabled, timezone')
    .eq('push_enabled', true)

  if (profilesError) throw profilesError
  const optedIn = (profiles ?? []) as ProfileRow[]
  if (optedIn.length === 0) {
    return { users: 0, streak: 0, todo: 0, timer: 0, sent: 0, removed: 0 }
  }

  const userIds = optedIn.map((p) => p.user_id)

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (subsError) throw subsError
  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const row of (subs ?? []) as PushSubscriptionRow[]) {
    const list = subsByUser.get(row.user_id) ?? []
    list.push(row)
    subsByUser.set(row.user_id, list)
  }

  const activeUsers = optedIn.filter((p) => (subsByUser.get(p.user_id) ?? []).length > 0)
  if (activeUsers.length === 0) {
    return { users: 0, streak: 0, todo: 0, timer: 0, sent: 0, removed: 0 }
  }
  const activeIds = activeUsers.map((p) => p.user_id)
  const tzByUser = new Map(activeUsers.map((p) => [p.user_id, p.timezone || 'UTC']))

  const [
    { data: streaks, error: streaksError },
    { data: todos, error: todosError },
    { data: tsSessions, error: tsError },
    { data: todoTimers, error: ttError },
  ] = await Promise.all([
    supabase
      .from('streaks')
      .select('id, user_id, name, emoji, frequency_type, target_weekdays, target_count, notify_enabled, notify_time, archived')
      .in('user_id', activeIds)
      .eq('notify_enabled', true)
      .eq('archived', false),
    supabase
      .from('todos')
      .select('id, user_id, title, due_date, notify_enabled, done, archived')
      .in('user_id', activeIds)
      .eq('notify_enabled', true)
      .eq('done', false)
      .eq('archived', false)
      .not('due_date', 'is', null),
    supabase
      .from('timesheet_sessions')
      .select('id, user_id, workspace_id, running_since, topic')
      .in('user_id', activeIds)
      .not('running_since', 'is', null),
    supabase
      .from('todo_timers')
      .select('id, user_id, todo_id, running_since')
      .in('user_id', activeIds)
      .not('running_since', 'is', null),
  ])

  if (streaksError) throw streaksError
  if (todosError) throw todosError
  if (tsError) throw tsError
  if (ttError) throw ttError

  // Prefetch streak entries for relevant date ranges (this week per user timezone).
  const weekStarts = new Set<string>()
  const todayKeys = new Set<string>()
  for (const userId of activeIds) {
    const local = localParts(now, tzByUser.get(userId)!)
    todayKeys.add(local.dateKey)
    weekStarts.add(startOfWeekMonday(local.dateKey))
  }
  const minWeekStart = [...weekStarts].sort()[0]
  const maxToday = [...todayKeys].sort().at(-1)!

  const streakIds = ((streaks ?? []) as StreakRow[]).map((s) => s.id)
  let entries: { streak_id: string; entry_date: string; completed: boolean }[] = []
  if (streakIds.length > 0 && minWeekStart) {
    const { data: entryRows, error: entryError } = await supabase
      .from('streak_entries')
      .select('streak_id, entry_date, completed')
      .in('streak_id', streakIds)
      .gte('entry_date', minWeekStart)
      .lte('entry_date', maxToday)
    if (entryError) throw entryError
    entries = entryRows ?? []
  }

  const entriesByStreak = new Map<string, { entry_date: string; completed: boolean }[]>()
  for (const e of entries) {
    const list = entriesByStreak.get(e.streak_id) ?? []
    list.push(e)
    entriesByStreak.set(e.streak_id, list)
  }

  // Workspace / todo names for timer labels
  const workspaceIds = [...new Set(((tsSessions ?? []) as { workspace_id: string }[]).map((s) => s.workspace_id))]
  const todoIds = [...new Set(((todoTimers ?? []) as { todo_id: string }[]).map((t) => t.todo_id))]
  const workspaceName = new Map<string, string>()
  const todoTitle = new Map<string, string>()
  if (workspaceIds.length > 0) {
    const { data } = await supabase.from('timesheet_workspaces').select('id, name, emoji').in('id', workspaceIds)
    for (const w of data ?? []) workspaceName.set(w.id, `${w.emoji} ${w.name}`)
  }
  if (todoIds.length > 0) {
    const { data } = await supabase.from('todos').select('id, title').in('id', todoIds)
    for (const t of data ?? []) todoTitle.set(t.id, t.title)
  }

  let streakCount = 0
  let todoCount = 0
  let timerCount = 0
  let sent = 0
  let removed = 0

  for (const streak of (streaks ?? []) as StreakRow[]) {
    if (!streak.notify_time) continue
    const tz = tzByUser.get(streak.user_id) ?? 'UTC'
    const local = localParts(now, tz)
    const target = parseNotifyMinutes(streak.notify_time)
    if (!withinNotifyWindow(local.minutesOfDay, target)) continue

    const weekStart = startOfWeekMonday(local.dateKey)
    const weekEnd = addDays(weekStart, 6)
    const streakEntries = entriesByStreak.get(streak.id) ?? []
    const completedToday = streakEntries.some((e) => e.entry_date === local.dateKey && e.completed)
    const completedThisWeek = streakEntries.filter(
      (e) => e.completed && e.entry_date >= weekStart && e.entry_date <= weekEnd,
    ).length

    if (!isStreakDueToday(streak, local, completedThisWeek, completedToday)) continue

    const claimed = await claimDelivery(supabase, streak.user_id, 'streak_reminder', streak.id, local.dateKey)
    if (!claimed) continue

    const result = await sendToUser(
      supabase,
      streak.user_id,
      {
        title: `${streak.emoji} ${streak.name}`,
        body: 'Reminder: mark today’s streak when you’re done.',
        url: `/streaks/${streak.id}`,
      },
      subsByUser,
    )
    streakCount++
    sent += result.sent
    removed += result.removed
  }

  for (const todo of (todos ?? []) as TodoRow[]) {
    const tz = tzByUser.get(todo.user_id) ?? 'UTC'
    const local = localParts(now, tz)
    if (todo.due_date > local.dateKey) continue
    // First nudge at 20:00 on/after due day; then daily at 20:00.
    if (local.minutesOfDay < 20 * 60) continue

    const claimed = await claimDelivery(supabase, todo.user_id, 'todo_overdue', todo.id, local.dateKey)
    if (!claimed) continue

    const overdue = todo.due_date < local.dateKey
    const result = await sendToUser(
      supabase,
      todo.user_id,
      {
        title: overdue ? 'Overdue task' : 'Task due today',
        body: todo.title,
        url: '/todos',
      },
      subsByUser,
    )
    todoCount++
    sent += result.sent
    removed += result.removed
  }

  const timers: TimerRow[] = [
    ...((tsSessions ?? []) as { id: string; user_id: string; workspace_id: string; running_since: string }[]).map(
      (s) => ({
        id: s.id,
        user_id: s.user_id,
        running_since: s.running_since,
        label: workspaceName.get(s.workspace_id) ?? 'Timesheet timer',
        url: `/timesheet/${s.workspace_id}`,
      }),
    ),
    ...((todoTimers ?? []) as { id: string; user_id: string; todo_id: string; running_since: string }[]).map((t) => ({
      id: t.id,
      user_id: t.user_id,
      running_since: t.running_since,
      label: todoTitle.get(t.todo_id) ?? 'Todo timer',
      url: '/todos',
    })),
  ]

  for (const timer of timers) {
    const tz = tzByUser.get(timer.user_id) ?? 'UTC'
    const local = localParts(now, tz)
    // Quiet hours 00:00–06:00 local
    if (local.hour >= 0 && local.hour < 6) continue

    const elapsedMs = now.getTime() - new Date(timer.running_since).getTime()
    const elapsedHours = elapsedMs / (1000 * 60 * 60)
    if (elapsedHours < 8) continue

    const bucketHour = Math.floor(elapsedHours / 2) * 2
    const bucket = `${timer.id}:${bucketHour}`
    const claimed = await claimDelivery(supabase, timer.user_id, 'timer_nudge', timer.id, bucket)
    if (!claimed) continue

    const hoursLabel = Math.floor(elapsedHours)
    const result = await sendToUser(
      supabase,
      timer.user_id,
      {
        title: 'Timer still running',
        body: `${timer.label} has been running for about ${hoursLabel}h.`,
        url: timer.url,
      },
      subsByUser,
    )
    timerCount++
    sent += result.sent
    removed += result.removed
  }

  return {
    users: activeUsers.length,
    streak: streakCount,
    todo: todoCount,
    timer: timerCount,
    sent,
    removed,
  }
}

async function runManual(
  supabase: SupabaseClient,
  body: { title?: string; body?: string; user_id?: string; url?: string },
) {
  const title = body.title?.trim()
  const text = body.body?.trim()
  if (!title || !text) {
    throw new Error('manual mode requires title and body')
  }

  configureWebPush()

  let query = supabase.from('profiles').select('user_id').eq('push_enabled', true)
  if (body.user_id) query = query.eq('user_id', body.user_id)
  const { data: profiles, error: profilesError } = await query
  if (profilesError) throw profilesError

  const userIds = ((profiles ?? []) as { user_id: string }[]).map((p) => p.user_id)
  if (userIds.length === 0) return { users: 0, sent: 0, removed: 0 }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (subsError) throw subsError

  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const row of (subs ?? []) as PushSubscriptionRow[]) {
    const list = subsByUser.get(row.user_id) ?? []
    list.push(row)
    subsByUser.set(row.user_id, list)
  }

  let sent = 0
  let removed = 0
  const bucket = `manual:${nowBucket()}`
  for (const userId of userIds) {
    if ((subsByUser.get(userId) ?? []).length === 0) continue
    await claimDelivery(supabase, userId, 'manual', null, `${bucket}:${userId}`)
    const result = await sendToUser(
      supabase,
      userId,
      { title, body: text, url: body.url ?? '/' },
      subsByUser,
    )
    sent += result.sent
    removed += result.removed
  }

  return { users: userIds.length, sent, removed }
}

function nowBucket() {
  return new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!authOk(req)) {
    return json(401, { error: 'Unauthorized' })
  }

  try {
    const supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    )

    const body = await req.json().catch(() => ({}))
    const mode = body?.mode === 'manual' ? 'manual' : 'cron'

    if (mode === 'manual') {
      const result = await runManual(supabase, body)
      return json(200, { ok: true, mode, ...result })
    }

    const result = await runCron(supabase)
    return json(200, { ok: true, mode: 'cron', ...result })
  } catch (err) {
    console.error(err)
    return json(500, {
      error: err instanceof Error ? err.message : 'Internal error',
    })
  }
})
