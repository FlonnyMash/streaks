import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, Flame, LayoutDashboard, ListTodo } from 'lucide-react'
import { BrandIcon } from '@/components/BrandIcon'
import { cn } from '@/lib/utils'
import { ProfileAvatarButton } from './ProfileAvatarButton'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
  { to: '/streaks', label: 'Streaks', icon: Flame, end: false },
  { to: '/todos', label: 'Todos', icon: ListTodo, end: false },
  { to: '/timesheet', label: 'Timesheet', icon: CalendarClock, end: false },
]

export function GlassNavbar() {
  return (
    <header className="hidden sm:block fixed inset-x-0 top-0 z-40 safe-top bg-[#f2f2f7]/80 dark:bg-black/75 backdrop-blur-xl border-b border-black/5 dark:border-white/8">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-3 min-w-0">
        <div className="glass-surface rounded-full px-3 h-14 flex items-center gap-2 flex-1 min-w-0 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-[15px] pl-1.5 min-w-0 shrink">
            <BrandIcon className="size-6 shrink-0" />
            <span className="truncate">Mashed Personal Dashboard</span>
          </div>
          <nav className="flex items-center gap-0.5 shrink-0 ml-auto">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={cn(
                  'relative flex items-center gap-1.5 h-9 px-2.5 lg:px-3 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                  'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10',
                  '[&.active]:text-accent-blue [&.active]:hover:bg-transparent',
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="desktopNavIndicator"
                        className="absolute inset-0 rounded-full bg-accent-blue/12"
                        transition={{ type: 'spring', stiffness: 500, damping: 34, mass: 0.9 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="glass-surface rounded-full size-14 flex items-center justify-center shrink-0 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
          <ProfileAvatarButton size="md" />
        </div>
      </div>
    </header>
  )
}
