import type { ReactNode } from 'react'
import { LegalFooterLinks } from '@/components/legal/LegalShared'

/** Full-viewport shell for login, signup, onboarding, and similar unauthenticated/setup pages. */
export function GuestPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))]">
      <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
        {children}
      </div>
      <LegalFooterLinks className="shrink-0" />
    </div>
  )
}
