import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, LayoutDashboard, ListTodo } from 'lucide-react'
import { BrandIcon } from '@/components/BrandIcon'
import { cn } from '@/lib/utils'
import { ProfileAvatarButton } from './ProfileAvatarButton'
import { SyncStatusButton } from '@/components/sync/SyncStatusButton'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
  { to: '/streaks', label: 'Streaks', icon: Flame, end: false },
  { to: '/todos', label: 'Todos', icon: ListTodo, end: false },
]

export function GlassNavbar() {
  return (
    <header className="hidden app-desktop:block fixed inset-x-0 top-0 z-40 safe-top pointer-events-none">
      <div className="mx-auto max-w-5xl safe-x [--safe-x-pad:1.5rem] pt-4 landscape:pt-2 flex items-center gap-3 min-w-0 pointer-events-auto">
        <div className="relative flex-1 min-w-0 h-14 landscape:h-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full glass-surface [--glass-blur:80px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent dark:from-white/16" />
          </div>
          <div className="relative z-10 h-full pl-4 pr-3 flex items-center gap-2 min-w-0">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight text-[15px] min-w-0 shrink rounded-full hover:opacity-80 active:scale-[0.98] transition-all"
            >
              <BrandIcon className="size-6 shrink-0" />
              <span className="truncate">Mashed Personal Dashboard</span>
            </Link>
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
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <SyncStatusButton size="md" />
          <div className="relative size-14 landscape:size-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-full glass-surface [--glass-blur:80px]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent dark:from-white/16" />
            </div>
            <div className="relative z-10 size-full flex items-center justify-center">
              <ProfileAvatarButton size="md" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
