import { Outlet } from 'react-router-dom'
import { PasskeySetupPrompt } from '@/components/auth/PasskeySetupPrompt'
import { GlassNavbar } from './GlassNavbar'
import { GlassTabBar } from './GlassTabBar'
import { MobileTopBar } from './MobileTopBar'
import { LegalFooterLinks } from '@/components/legal/LegalShared'

export function AppShell() {
  return (
    <div className="min-h-dvh flex flex-col app-shell">
      <PasskeySetupPrompt />
      <GlassNavbar />
      <MobileTopBar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:pt-[calc(5.5rem+env(safe-area-inset-top,0px))] pb-[calc(5.5rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))] sm:pb-8">
        <Outlet />
        <footer className="hidden sm:block mt-12 pt-6 border-t border-black/8 dark:border-white/10">
          <LegalFooterLinks className="justify-start text-[13px] gap-4" />
        </footer>
      </main>
      <GlassTabBar />
    </div>
  )
}