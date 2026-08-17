import type { ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useIsRestoring } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Spinner } from '@/components/ui/Spinner'
import { ProfileLoadError } from '@/components/auth/ProfileLoadError'
import { isOnboardingTourCompleted } from '@/lib/profile'

/**
 * Guards /onboarding: only reachable while signed in, with profile setup already done. Once the
 * tour is completed it redirects home — unless `?replay=1` is present (Settings' "Replay
 * onboarding" entry), which lets a returning user revisit the tour on demand.
 */
export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const isRestoring = useIsRestoring()
  const [searchParams] = useSearchParams()
  const replay = searchParams.get('replay') === '1'
  const { data: profile, isLoading: profileLoading, isError, isFetching, refetch, isRefetching } =
    useProfile()

  if (loading || isRestoring) return <Spinner />
  if (!user) return <Navigate to="/login" replace />

  // Cached profile from a previous session: skip the wait while a background refetch runs.
  if (profile && profile.onboarding_required) {
    return <Navigate to="/complete-profile" replace />
  }
  if (profile && isOnboardingTourCompleted(profile) && !replay) {
    return <Navigate to="/dashboard" replace />
  }
  if (profile && (!isOnboardingTourCompleted(profile) || replay)) {
    return <>{children}</>
  }

  if (profileLoading || (isFetching && !profile && !isError)) return <Spinner />

  if (isError && !profile) {
    return (
      <ProfileLoadError
        retrying={isRefetching}
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  // Successful fetch with no row, or name/DOB setup still required — tour comes after that.
  if (!profile || profile.onboarding_required) {
    return <Navigate to="/complete-profile" replace />
  }

  return <>{children}</>
}
