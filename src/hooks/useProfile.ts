import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { Profile } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { isLikelyNetworkError } from '@/lib/offline/network'

const PROFILE_KEY = ['profile'] as const

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...PROFILE_KEY, user?.id],
    enabled: Boolean(user),
    // iOS home-screen PWAs often fail the first fetch on cold start ("Load failed").
    retry: (failureCount, error) => {
      if (failureCount >= 4) return false
      return isLikelyNetworkError(error) || failureCount < 2
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: 60_000,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
  })
}

export function useUpdateFirstName() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (firstName: string) => {
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('profiles')
        .update({ first_name: firstName })
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROFILE_KEY, user?.id] })
    },
  })
}

/** Sets date_of_birth once. The DB trigger rejects this if it's already set or under 16. */
export function useSetDateOfBirth() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dateOfBirth: string) => {
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('profiles')
        .update({ date_of_birth: dateOfBirth })
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROFILE_KEY, user?.id] })
    },
  })
}

/** Uploads a new avatar image to Storage and saves its public URL on the profile. */
export function useUpdateAvatar() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not signed in')
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)

      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROFILE_KEY, user?.id] })
    },
  })
}

/** Clears the custom avatar so the UI falls back to the OAuth provider's picture (if any). */
export function useRemoveAvatar() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROFILE_KEY, user?.id] })
    },
  })
}

/** Used by Settings after enablePush / disablePush succeeds (or to refresh prefs). */
export function useInvalidateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [...PROFILE_KEY, user?.id] })
  }
}

/** Used by the post-OAuth /complete-profile screen: confirms name + sets DOB in one step. */
export function useCompleteOnboarding() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: { firstName: string; dateOfBirth: string }) => {
      if (!user) throw new Error('Not signed in')
      // Upsert covers race cases where the auth.users trigger hasn't created a
      // profile row yet (or the earlier fetch returned null).
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            first_name: input.firstName,
            date_of_birth: input.dateOfBirth,
            onboarding_required: false,
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...PROFILE_KEY, user?.id], data)
      queryClient.invalidateQueries({ queryKey: [...PROFILE_KEY, user?.id] })
    },
  })
}
