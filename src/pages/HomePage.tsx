import { GreetingHeader } from '@/components/dashboard/GreetingHeader'
import { TodayStreaksWidget } from '@/components/dashboard/TodayStreaksWidget'
import { StreakHighlightsWidget } from '@/components/dashboard/StreakHighlightsWidget'
import { TodosTodayWidget } from '@/components/dashboard/TodosTodayWidget'
import { TimesheetTodayWidget } from '@/components/dashboard/TimesheetTodayWidget'

export function HomePage() {
  return (
    <div>
      <GreetingHeader />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayStreaksWidget />
        <StreakHighlightsWidget />
        <TodosTodayWidget />
        <TimesheetTodayWidget />
      </div>
    </div>
  )
}
