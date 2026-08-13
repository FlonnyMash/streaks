/** Matches Tailwind `app-desktop` — desktop width or any landscape. */
export const APP_DESKTOP_MQ = '(min-width: 640px), (orientation: landscape)'

export function isAppDesktopLayout(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(APP_DESKTOP_MQ).matches
}
