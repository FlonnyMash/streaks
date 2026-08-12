import type { ReactNode } from 'react'
import { GlassNavbar } from './GlassNavbar'
import { GlassTabBar } from './GlassTabBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <GlassNavbar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:pt-8 pb-[calc(120px+env(safe-area-inset-bottom,0px))] sm:pb-16">
        {children}
      </main>
      <GlassTabBar />
    </div>
  )
}
