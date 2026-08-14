import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useIsRestoring } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Spinner } from '@/components/ui/Spinner'
import { ProfileLoadError } from '@/components/auth/ProfileLoadError'

/** Guards /complete-profile: only reachable while signed in and onboarding is still required. */
export function CompleteProfileRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const isRestoring = useIsRestoring()
  const { data: profile, isLoading: profileLoading, isError, isFetching, refetch, isRefetching } =
    useProfile()

  if (loading || isRestoring) return <Spinner />
  if (!user) return <Navigate to="/login" replace />

  // Already finished — never trap a returning user on this screen because of a flaky fetch.
  if (profile && !profile.onboarding_required) {
    return <Navigate to="/dashboard" replace />
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

  return <>{children}</>
}
