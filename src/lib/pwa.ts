export type InstallPlatform = 'ios' | 'android' | 'other'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

type InstallPromptListener = (available: boolean) => void

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<InstallPromptListener>()

function notifyListeners() {
  const available = deferredPrompt !== null
  listeners.forEach((listener) => listener(available))
}

/** Capture the browser install event as early as possible (Android Chrome / Edge). */
export function initPwaInstallCapture() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notifyListeners()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notifyListeners()
  })
}

export function subscribeInstallPrompt(listener: InstallPromptListener) {
  listeners.add(listener)
  listener(deferredPrompt !== null)
  return () => {
    listeners.delete(listener)
  }
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null
}

/** Triggers the native install dialog when the browser supports it. */
export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  const promptEvent = deferredPrompt
  deferredPrompt = null
  notifyListeners()
  await promptEvent.prompt()
  const { outcome } = await promptEvent.userChoice
  return outcome
}

/** True when the app is already running from the home screen / installed PWA. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const displayStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayStandalone || Boolean(iosStandalone)
}

export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  // iPadOS 13+ reports as MacIntel with touch
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) {
    return 'ios'
  }
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}
