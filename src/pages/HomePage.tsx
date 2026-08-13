import { GreetingHeader } from '@/components/dashboard/GreetingHeader'
import { TodayStreaksWidget } from '@/components/dashboard/TodayStreaksWidget'
import { StreakHighlightsWidget } from '@/components/dashboard/StreakHighlightsWidget'
import { TodosTodayWidget } from '@/components/dashboard/TodosTodayWidget'
import { TimesheetTodayWidget } from '@/components/dashboard/TimesheetTodayWidget'
import { AddToHomeScreenTip } from '@/components/pwa/AddToHomeScreen'

export function HomePage() {
  return (
    <div>
      <GreetingHeader />
      <AddToHomeScreenTip />

      <div className="grid grid-cols-1 app-desktop:grid-cols-2 gap-4 items-stretch">
        <TodayStreaksWidget />
        <StreakHighlightsWidget />
        <TodosTodayWidget />
        <TimesheetTodayWidget />
      </div>
    </div>
  )
}
