import { useLayoutEffect } from 'react'
import { APP_DESKTOP_MQ, isAppDesktopLayout } from '@/lib/layout'

/**
 * iOS standalone PWAs often settle the layout viewport late on cold start, so a
 * `position: fixed; bottom: 0` tab bar can sit too high until a later reflow
 * (e.g. route change). Keep CSS vars fresh and nudge WebKit after launch.
 * Only runs while mobile portrait chrome (tab bar) is shown.
 */
export function useStableMobileViewport() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    const measureSafeAreaBottom = () => {
      const probe = document.createElement('div')
      probe.style.cssText =
        'position:fixed;left:0;bottom:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none'
      document.body.appendChild(probe)
      const sab = parseFloat(getComputedStyle(probe).paddingBottom) || 0
      document.body.removeChild(probe)
      return sab
    }

    const nudgeWebKitViewport = () => {
      const prevMinHeight = root.style.minHeight
      root.style.minHeight = `${window.innerHeight + 1}px`
      void root.offsetHeight
      root.style.minHeight = prevMinHeight
      void root.offsetHeight
      window.scrollTo(0, 0)
    }

    const sync = (nudge = false) => {
      if (nudge) nudgeWebKitViewport()

      const vv = window.visualViewport
      const height = vv?.height ?? window.innerHeight
      const offsetTop = vv?.offsetTop ?? 0
      const bottomShift = Math.max(0, window.innerHeight - height - offsetTop)
      const sab = measureSafeAreaBottom()

      root.style.setProperty('--app-height', `${Math.round(height)}px`)
      root.style.setProperty('--fixed-bottom-shift', `${Math.round(bottomShift)}px`)
      root.style.setProperty('--safe-area-bottom', `${sab}px`)
    }

    const syncSoft = () => sync(false)
    const syncHard = () => sync(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync(true)
    }

    let attached = false

    const attach = () => {
      if (attached) return
      attached = true
      sync(true)
      const frame = requestAnimationFrame(() => sync(true))
      const timeouts = [50, 150, 400, 1000, 2000].map((ms) => window.setTimeout(() => sync(true), ms))

      window.addEventListener('resize', syncSoft)
      window.addEventListener('orientationchange', syncHard)
      window.addEventListener('pageshow', syncHard)
      document.addEventListener('visibilitychange', onVisible)
      window.visualViewport?.addEventListener('resize', syncSoft)
      window.visualViewport?.addEventListener('scroll', syncSoft)

      return () => {
        attached = false
        cancelAnimationFrame(frame)
        timeouts.forEach(clearTimeout)
        window.removeEventListener('resize', syncSoft)
        window.removeEventListener('orientationchange', syncHard)
        window.removeEventListener('pageshow', syncHard)
        document.removeEventListener('visibilitychange', onVisible)
        window.visualViewport?.removeEventListener('resize', syncSoft)
        window.visualViewport?.removeEventListener('scroll', syncSoft)
      }
    }

    let detach = isAppDesktopLayout() ? undefined : attach()

    const onLayoutChange = () => {
      detach?.()
      detach = undefined
      if (!isAppDesktopLayout()) detach = attach()
    }

    const mq = window.matchMedia(APP_DESKTOP_MQ)
    mq.addEventListener('change', onLayoutChange)

    return () => {
      mq.removeEventListener('change', onLayoutChange)
      detach?.()
    }
  }, [])
}
