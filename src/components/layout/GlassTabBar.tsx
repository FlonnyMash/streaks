import { NavLink } from 'react-router-dom'
import { LayoutGrid, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Streaks', icon: LayoutGrid, end: true },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

export function GlassTabBar() {
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom">
      <div className="mx-3 mb-3">
        <div className="glass-surface rounded-[26px] h-[64px] flex items-center justify-around shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            >
              {({ isActive }) => (
                <>
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
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
