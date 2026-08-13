import { supabase } from '@/lib/supabaseClient'
import { PushPermissionDeniedError } from '@/lib/notificationBlocked'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Reads the browser/OS notification permission (not an in-app preference). */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/** Current IANA timezone from the device — use this whenever scheduling needs "local". */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

function subscriptionKeys(subscription: PushSubscription): { p256dh: string; auth: string } {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!p256dh || !auth) throw new Error('Push subscription is missing encryption keys.')
  return { p256dh, auth }
}

async function upsertSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  const { p256dh, auth } = subscriptionKeys(subscription)
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

async function ensureBrowserSubscription(): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Push is not configured (missing VITE_VAPID_PUBLIC_KEY).')
  }
  const registration = await getRegistration()
  await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  }
  return subscription
}

async function removeThisDeviceSubscription(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  } catch {
    // Best-effort.
  }
}

async function refreshPushEnabledFlag(userId: string): Promise<void> {
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ push_enabled: (count ?? 0) > 0 })
    .eq('user_id', userId)
  if (profileError) throw profileError
}

/**
 * Aligns server state with this device’s notification permission.
 * Always refreshes `timezone` from the device when notifications are allowed (travel-safe).
 * Only removes this device’s subscription if permission is not granted.
 */
export async function syncPushWithDevice(userId: string): Promise<NotificationPermission | 'unsupported'> {
  const permission = getNotificationPermission()

  if (permission === 'granted') {
    const subscription = await ensureBrowserSubscription()
    await upsertSubscription(userId, subscription)
    const { error } = await supabase
      .from('profiles')
      .update({
        push_enabled: true,
        timezone: getLocalTimezone(),
      })
      .eq('user_id', userId)
    if (error) throw error
    return permission
  }

  await removeThisDeviceSubscription()
  await refreshPushEnabledFlag(userId)
  return permission
}

/** Prompt for device permission (only when still undecided), then sync. */
export async function enablePush(userId: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  let permission = getNotificationPermission()
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission !== 'granted') {
    if (permission === 'denied') throw new PushPermissionDeniedError()
    throw new Error('Notification permission was not granted.')
  }

  await syncPushWithDevice(userId)
}

/** Remove this device’s subscription only (other devices keep working). */
export async function disablePush(userId: string): Promise<void> {
  await removeThisDeviceSubscription()
  await refreshPushEnabledFlag(userId)
}
