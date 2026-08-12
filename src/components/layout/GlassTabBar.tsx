import { useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, Flame, ListTodo, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStableMobileViewport } from '@/hooks/useStableMobileViewport'

const links = [
  { to: '/streaks', label: 'Streaks', icon: Flame, end: false },
  { to: '/todos', label: 'Todos', icon: ListTodo, end: false },
  { to: '/timesheet', label: 'Timesheet', icon: CalendarClock, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

export function GlassTabBar() {
  useStableMobileViewport()
  const navRef = useRef<HTMLElement>(null)
  const location = useLocation()

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav || window.matchMedia('(min-width: 640px)').matches) return

    const readSab = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')
      const parsed = parseFloat(raw)
      if (Number.isFinite(parsed)) return parsed
      return 0
    }

    const correctPosition = () => {
      nav.style.bottom = '0px'
      nav.style.paddingBottom = `max(0.5rem, var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))`
      void nav.offsetHeight

      const surface = nav.querySelector('[data-tabbar-surface]')
      if (!(surface instanceof HTMLElement)) return

      const glassBottom = surface.getBoundingClientRect().bottom
      const vv = window.visualViewport
      const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
      const spaceBelowGlass = viewBottom - glassBottom
      const desired = Math.max(8, readSab())

      // Cold-start iOS can leave extra empty space under the pill; pull the bar down.
      if (spaceBelowGlass > desired + 2) {
        const excess = spaceBelowGlass - desired
        nav.style.bottom = `${-Math.round(excess)}px`
      }
    }

    correctPosition()
    const frame = requestAnimationFrame(correctPosition)
    const timeouts = [50, 150, 400, 1000, 2000].map((ms) => window.setTimeout(correctPosition, ms))
    window.addEventListener('resize', correctPosition)
    window.visualViewport?.addEventListener('resize', correctPosition)
    window.visualViewport?.addEventListener('scroll', correctPosition)

    return () => {
      cancelAnimationFrame(frame)
      timeouts.forEach(clearTimeout)
      window.removeEventListener('resize', correctPosition)
      window.visualViewport?.removeEventListener('resize', correctPosition)
      window.visualViewport?.removeEventListener('scroll', correctPosition)
    }
  }, [location.pathname])

  return (
    <nav ref={navRef} className="sm:hidden fixed inset-x-0 z-40 px-3 tabbar-bottom" aria-label="Primary">
      <div
        data-tabbar-surface
        className="glass-surface rounded-full h-[64px] flex items-center justify-around shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]"
      >
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="relative flex-1 h-full flex items-center justify-center">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobileTabIndicator"
                    className="absolute inset-y-2 inset-x-1.5 rounded-full bg-black/6 dark:bg-white/12"
                    transition={{ type: 'spring', stiffness: 500, damping: 34, mass: 0.9 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                  <Icon
                    className={cn('size-[22px]', isActive ? 'text-accent-blue' : 'text-black/45 dark:text-white/45')}
                    fill={isActive ? 'currentColor' : 'none'}
                    fillOpacity={isActive ? 0.15 : 0}
                  />
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      isActive ? 'text-accent-blue' : 'text-black/45 dark:text-white/45',
                    )}
                  >
                    {label}
                  </span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
