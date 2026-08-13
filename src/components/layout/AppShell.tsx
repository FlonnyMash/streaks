import { Outlet } from 'react-router-dom'
import { PasskeySetupPrompt } from '@/components/auth/PasskeySetupPrompt'
import { GlassNavbar } from './GlassNavbar'
import { GlassTabBar } from './GlassTabBar'
import { MobileTopBar } from './MobileTopBar'
import { LegalFooterLinks } from '@/components/legal/LegalShared'
import { TimesheetTimerProvider } from '@/hooks/useTimesheetTimer'
import { TodoTimerProvider } from '@/hooks/useTodoTimer'
import { TodoTimePromptProvider } from '@/hooks/useTodoTimePrompt'
import { useSyncPushWithDevice } from '@/hooks/useSyncPushWithDevice'
import { ReplacePausedTimerModal } from '@/components/timesheet/ReplacePausedTimerModal'
import { StopTimerModal } from '@/components/timesheet/StopTimerModal'
import { TodoTimePromptModal } from '@/components/todos/TodoTimePromptModal'
import { TodoTimerSwitchModal } from '@/components/todos/TodoTimerSwitchModal'

export function AppShell() {
  useSyncPushWithDevice()

  return (
    <TimesheetTimerProvider>
      <TodoTimerProvider>
        <TodoTimePromptProvider>
          <div className="min-h-dvh flex flex-col app-shell">
            <PasskeySetupPrompt />
            <GlassNavbar />
            <MobileTopBar />
            <main className="flex-1 mx-auto w-full max-w-5xl safe-x [--safe-x-pad:1rem] app-desktop:[--safe-x-pad:1.5rem] pt-[calc(3.5rem+env(safe-area-inset-top,0px))] [@media(min-width:640px)_and_(orientation:portrait)]:pt-[calc(6.5rem+env(safe-area-inset-top,0px))] landscape:pt-[calc(4.75rem+env(safe-area-inset-top,0px))] pb-[calc(5.5rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))] app-desktop:pb-8">
              <Outlet />
              <footer className="hidden app-desktop:block mt-12 pt-6 border-t border-black/8 dark:border-white/10">
                <LegalFooterLinks className="justify-start text-[13px] gap-4" />
              </footer>
            </main>
            <GlassTabBar />
            <StopTimerModal />
            <ReplacePausedTimerModal />
            <TodoTimerSwitchModal />
            <TodoTimePromptModal />
          </div>
        </TodoTimePromptProvider>
      </TodoTimerProvider>
    </TimesheetTimerProvider>
  )
}
