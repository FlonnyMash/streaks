import { getInstallPlatform, isStandaloneDisplay } from '@/lib/pwa'

export type NotificationSurface = 'browser' | 'device'

export interface NotificationBlockedGuidance {
  /** Where the block is most likely controlled from. */
  surface: NotificationSurface
  /** Short label for copy: "browser" or "device". */
  surfaceLabel: string
  title: string
  summary: string
  steps: string[]
  /** Best-effort deep link into OS / app settings (may be ignored by the browser). */
  settingsHref: string | null
  settingsLabel: string | null
}

function isWindows(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Windows/i.test(navigator.userAgent) || navigator.platform?.startsWith('Win') === true
}

function isChromium(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Chrome|Chromium|Edg|CriOS/i.test(navigator.userAgent) && !/Firefox/i.test(navigator.userAgent)
}

function isFirefox(): boolean {
  return typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent)
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/i.test(navigator.userAgent)
}

/**
 * Context-aware copy + optional settings link when Notification.permission === 'denied'.
 * Web apps cannot always open the exact permission screen; we deep-link when the OS allows it
 * and otherwise give precise steps for the current surface (browser tab vs installed app).
 */
export function getNotificationBlockedGuidance(): NotificationBlockedGuidance {
  const standalone = isStandaloneDisplay()
  const platform = getInstallPlatform()
  const surface: NotificationSurface = standalone ? 'device' : 'browser'
  const surfaceLabel = surface === 'device' ? 'device' : 'browser'

  if (standalone && platform === 'ios') {
    return {
      surface,
      surfaceLabel,
      title: 'Notifications blocked on this device',
      summary:
        'iOS has blocked notifications for this installed app. Turn them back on in device Settings, then return here.',
      steps: [
        'Open the Settings app on your iPhone or iPad.',
        'Scroll to Mashed (or this app’s name) and open it.',
        'Tap Notifications and turn Allow Notifications on.',
        'Come back to the app and tap Try again.',
      ],
      // Apple blocks prefs: URLs from web content in modern iOS.
      settingsHref: null,
      settingsLabel: null,
    }
  }

  if (standalone && platform === 'android') {
    return {
      surface,
      surfaceLabel,
      title: 'Notifications blocked on this device',
      summary:
        'Android has blocked notifications for this app. Enable them in device notification settings, then return here.',
      steps: [
        'Open Android Settings → Apps → Mashed (or Chrome → Notifications if it opens as a site).',
        'Turn Notifications on for this app.',
        'Also check that the site isn’t blocked under Site settings → Notifications.',
        'Return here and tap Try again.',
      ],
      settingsHref: 'intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;end',
      settingsLabel: 'Open device notification settings',
    }
  }

  if (standalone && isWindows()) {
    return {
      surface,
      surfaceLabel,
      title: 'Notifications blocked on this device',
      summary:
        'Windows or this installed app is blocking notifications. Enable them in device settings, then return here.',
      steps: [
        'Open Windows notification settings with the button below (or Settings → System → Notifications).',
        'Make sure notifications are on for this app / your browser.',
        'Return here and tap Try again.',
      ],
      settingsHref: 'ms-settings:notifications',
      settingsLabel: 'Open device notification settings',
    }
  }

  // Browser tab (not installed)
  if (platform === 'ios') {
    return {
      surface: 'browser',
      surfaceLabel: 'browser',
      title: 'Notifications blocked in this browser',
      summary:
        'Safari has blocked notifications for this site. Change the site permission in Safari, then return here.',
      steps: [
        'Tap aA (or the page settings control) in Safari’s address bar.',
        'Open Website Settings.',
        'Set Notifications to Allow.',
        'Reload the page and tap Try again.',
      ],
      settingsHref: null,
      settingsLabel: null,
    }
  }

  if (isFirefox()) {
    return {
      surface: 'browser',
      surfaceLabel: 'browser',
      title: 'Notifications blocked in this browser',
      summary:
        'Firefox has blocked notifications for this site. Allow them in browser site settings, then return here.',
      steps: [
        'Click the lock / permissions icon in the address bar.',
        'Find Notifications and set it to Allow.',
        'If needed open Firefox Settings → Privacy & Security → Permissions → Notifications → Settings…',
        'Return here and tap Try again.',
      ],
      settingsHref: null,
      settingsLabel: null,
    }
  }

  if (isSafari()) {
    return {
      surface: 'browser',
      surfaceLabel: 'browser',
      title: 'Notifications blocked in this browser',
      summary:
        'Safari has blocked notifications for this site. Allow them in Safari settings, then return here.',
      steps: [
        'Open Safari Settings → Websites → Notifications.',
        'Find this site and set it to Allow.',
        'Return here and tap Try again.',
      ],
      settingsHref: null,
      settingsLabel: null,
    }
  }

  // Chromium desktop / Android browser tab
  const chromiumSteps = isChromium()
    ? [
        'Click the lock or tune icon left of the address bar.',
        'Open Site settings (or Notifications).',
        'Set Notifications to Allow.',
        'Return here and tap Try again.',
      ]
    : [
        'Open this site’s permissions from the address bar (lock / info icon).',
        'Set Notifications to Allow.',
        'Return here and tap Try again.',
      ]

  return {
    surface: 'browser',
    surfaceLabel: 'browser',
    title: 'Notifications blocked in this browser',
    summary:
      'Your browser has blocked notifications for this site. Allow them in browser settings, then return here.',
    steps: chromiumSteps,
    settingsHref: isWindows() ? 'ms-settings:notifications' : null,
    settingsLabel: isWindows() ? 'Open Windows notification settings' : null,
  }
}

export class PushPermissionDeniedError extends Error {
  readonly guidance: NotificationBlockedGuidance

  constructor(guidance = getNotificationBlockedGuidance()) {
    super(guidance.summary)
    this.name = 'PushPermissionDeniedError'
    this.guidance = guidance
  }
}

export function isPushPermissionDeniedError(err: unknown): err is PushPermissionDeniedError {
  return err instanceof PushPermissionDeniedError || (err instanceof Error && err.name === 'PushPermissionDeniedError')
}
