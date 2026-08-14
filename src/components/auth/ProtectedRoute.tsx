import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useIsRestoring } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Spinner } from '@/components/ui/Spinner'
import { ProfileLoadError } from '@/components/auth/ProfileLoadError'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const isRestoring = useIsRestoring()
  const { data: profile, isLoading: profileLoading, isError, isFetching, refetch, isRefetching } =
    useProfile()

  if (loading || isRestoring) return <Spinner />
  if (!user) return <Navigate to="/login" replace />

  // Cached profile from a previous session: enter the app while a background refetch runs.
  if (profile && !profile.onboarding_required) {
    return <>{children}</>
  }

  if (profileLoading || (isFetching && !profile && !isError)) return <Spinner />

  // Network / cold-start failure must not look like unfinished onboarding.
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

  // Successful fetch with no row, or onboarding still required.
  if (!profile || profile.onboarding_required) {
    return <Navigate to="/complete-profile" replace />
  }

  return <>{children}</>
}
