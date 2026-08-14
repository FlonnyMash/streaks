import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { getErrorMessage } from '@/lib/errors'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (
    email: string,
    password: string,
    profile: { firstName: string; dateOfBirth: string },
  ) => Promise<{ error: string | null }>
  signInWithGitHub: () => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signInWithPasskey: () => Promise<{ error: string | null }>
  registerPasskey: () => Promise<{ error: string | null }>
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>
  ensureSession: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function redirectTo(path: string) {
  return `${window.location.origin}${path}`
}

async function ensureFreshSession(): Promise<{ error: string | null }> {
  const { data: current, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) return { error: sessionError.message }
  if (current?.session) {
    // Validate the JWT with the server so registration/list/delete don't race a stale token.
    const { error: userError } = await supabase.auth.getUser()
    if (!userError) return { error: null }
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) return { error: refreshError.message }
  if (!refreshed?.session) return { error: 'Auth session missing! Please sign out and sign in again.' }
  return { error: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data?.session ?? null)
      setLoading(false)

      // iOS standalone cold starts often restore a stale access token; refresh quietly.
      if (data?.session) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (!cancelled && refreshed?.session) {
          setSession(refreshed.session)
        }
      }
    }

    void bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    const rehydrate = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return
      void supabase.auth.getSession().then(({ data }) => {
        if (data?.session) setSession(data.session)
      })
    }
    document.addEventListener('visibilitychange', rehydrate)
    window.addEventListener('pageshow', rehydrate)

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', rehydrate)
      window.removeEventListener('pageshow', rehydrate)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      ensureSession: ensureFreshSession,
      async signInWithPassword(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: error.message }
        if (!data?.session) return { error: 'Sign-in succeeded but no session was returned.' }
        return { error: null }
      },
      async signUpWithPassword(email, password, profile) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo('/auth/callback'),
            data: {
              first_name: profile.firstName,
              date_of_birth: profile.dateOfBirth,
            },
          },
        })
        return { error: error?.message ?? null }
      },
      async signInWithGitHub() {
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: redirectTo('/auth/callback') },
          })
          return { error: error?.message ?? null }
        } catch (err) {
          return { error: getErrorMessage(err) }
        }
      },
      async signInWithGoogle() {
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectTo('/auth/callback') },
          })
          return { error: error?.message ?? null }
        } catch (err) {
          return { error: getErrorMessage(err) }
        }
      },
      async signInWithPasskey() {
        try {
          const { data, error } = await supabase.auth.signInWithPasskey()
          if (error) return { error: error.message }
          if (!data?.session) {
            return { error: 'Passkey verified, but no session was created. Check Passkeys are enabled and your Relying Party origins include this site.' }
          }
          return { error: null }
        } catch (err) {
          return { error: getErrorMessage(err) }
        }
      },
      async registerPasskey() {
        try {
          const ensured = await ensureFreshSession()
          if (ensured.error) return ensured
          const { error } = await supabase.auth.registerPasskey()
          return { error: error?.message ?? null }
        } catch (err) {
          return { error: getErrorMessage(err) }
        }
      },
      async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo('/auth/callback?type=recovery'),
        })
        return { error: error?.message ?? null }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
