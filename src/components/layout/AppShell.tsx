import { Outlet } from 'react-router-dom'
import { GlassNavbar } from './GlassNavbar'
import { GlassTabBar } from './GlassTabBar'
import { LegalFooterLinks } from '@/components/legal/LegalShared'

export function AppShell() {
  return (
    <div className="min-h-dvh flex flex-col app-shell">
      <GlassNavbar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:pt-8 pb-[calc(5.5rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))] sm:pb-8">
        <Outlet />
        <footer className="hidden sm:block mt-12 pt-6 border-t border-black/8 dark:border-white/10">
          <LegalFooterLinks className="justify-start text-[13px] gap-4" />
        </footer>
      </main>
      <GlassTabBar />
    </div>
  )
}
