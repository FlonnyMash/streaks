import type { ReactNode } from 'react'
import { GlassNavbar } from './GlassNavbar'
import { GlassTabBar } from './GlassTabBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <GlassNavbar />
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain mx-auto w-full max-w-5xl px-4 sm:px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:pt-8 pb-6 sm:pb-16">
        {children}
      </main>
      <GlassTabBar />
    </div>
  )
}
