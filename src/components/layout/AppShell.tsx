import type { ReactNode } from 'react'
import { GlassNavbar } from './GlassNavbar'
import { GlassTabBar } from './GlassTabBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <GlassNavbar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5 sm:pt-8 pb-[120px] sm:pb-16">
        {children}
      </main>
      <GlassTabBar />
    </div>
  )
}
