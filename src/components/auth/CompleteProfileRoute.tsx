import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Spinner } from '@/components/ui/Spinner'

/** Guards /complete-profile: only reachable while signed in and onboarding is still required. */
export function CompleteProfileRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { data: profile, isLoading: profileLoading, isError } = useProfile()

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (profileLoading) return <Spinner />
  // Only send users into the app once we have a real profile that finished onboarding.
  // A null/error profile stays on this page so they can complete (upsert) it.
  if (!isError && profile && !profile.onboarding_required) {
    return <Navigate to="/streaks" replace />
  }
  return <>{children}</>
}
