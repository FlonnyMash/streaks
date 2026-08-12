/** Thin wrapper around the Vibration API; silently no-ops where unsupported (e.g. iOS Safari, desktop). */
function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Ignore — some browsers throw if called outside a user gesture.
  }
}

export function hapticTick() {
  vibrate(12)
}

export function hapticUndo() {
  vibrate(8)
}

export function hapticMilestone() {
  vibrate([20, 60, 20, 60, 30])
}
