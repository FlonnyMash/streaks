import { GreetingHeader } from '@/components/dashboard/GreetingHeader'
import { FlonnyChat } from '@/components/dashboard/FlonnyChat'
import { TodayStreaksWidget } from '@/components/dashboard/TodayStreaksWidget'
import { StreakHighlightsWidget } from '@/components/dashboard/StreakHighlightsWidget'
import { TodosTodayWidget } from '@/components/dashboard/TodosTodayWidget'
import { AddToHomeScreenTip } from '@/components/pwa/AddToHomeScreen'

export function HomePage() {
  return (
    <div>
      <GreetingHeader />
      <FlonnyChat />
      <AddToHomeScreenTip />

      <div className="grid grid-cols-1 app-desktop:grid-cols-2 gap-4 items-stretch">
        <TodayStreaksWidget />
        <StreakHighlightsWidget />
        <TodosTodayWidget />
      </div>
    </div>
  )
}
