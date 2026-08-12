import { useEffect, useState } from 'react'
import { Cake } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { getTimeGreeting, isBirthdayToday } from '@/lib/greeting'

export function GreetingHeader() {
  const { data: profile } = useProfile()
  const [now, setNow] = useState(() => new Date())

  // Keeps the greeting correct if the dashboard is left open across a time-of-day boundary.
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const name = profile?.first_name?.trim()
  const birthday = isBirthdayToday(profile?.date_of_birth, now)
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mb-6">
      <p className="text-[13px] font-medium text-black/45 dark:text-white/45 mb-1">{todayLabel}</p>
      {birthday ? (
        <div className="flex items-center gap-2">
          <Cake className="size-7 text-accent-pink shrink-0" />
          <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">
            Happy Birthday{name ? `, ${name}` : ''}!
          </h1>
        </div>
      ) : (
        <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight">
          {getTimeGreeting(now)}{name ? `, ${name}` : ''}
        </h1>
      )}
      <p className="text-black/50 dark:text-white/50 text-[15px] mt-0.5">
        {birthday ? 'Hope your day is a great one.' : "Here's what's on your plate today."}
      </p>
    </div>
  )
}
