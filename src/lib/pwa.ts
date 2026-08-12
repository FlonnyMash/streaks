export type InstallPlatform = 'ios' | 'android' | 'other'

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
