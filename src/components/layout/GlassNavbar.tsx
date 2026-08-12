import { NavLink } from 'react-router-dom'
import { CalendarClock, Flame, ListTodo, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/streaks', label: 'Streaks', icon: Flame, end: false },
  { to: '/todos', label: 'Todos', icon: ListTodo, end: false },
  { to: '/timesheet', label: 'Timesheet', icon: CalendarClock, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

export function GlassNavbar() {
  return (
    <header className="hidden sm:block sticky top-0 z-40 safe-top">
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <div className="glass-surface rounded-2xl px-4 h-16 flex items-center justify-between shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-[17px]">
            <Flame className="size-5 text-accent-orange" fill="currentColor" fillOpacity={0.15} />
            Mashed Personal Dashboard
          </div>
          <nav className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-blue/12 text-accent-blue'
                      : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
