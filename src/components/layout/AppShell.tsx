import type { ReactNode } from 'react'
import { GlassNavbar } from './GlassNavbar'
import { GlassTabBar } from './GlassTabBar'
import { LegalFooterLinks } from '@/components/legal/LegalShared'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <GlassNavbar />
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain mx-auto w-full max-w-5xl px-4 sm:px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:pt-8 pb-6 sm:pb-8">
        {children}
        <footer className="hidden sm:block mt-12 pt-6 border-t border-black/8 dark:border-white/10">
          <LegalFooterLinks className="justify-start text-[13px] gap-4" />
        </footer>
      </main>
      <GlassTabBar />
    </div>
  )
}
