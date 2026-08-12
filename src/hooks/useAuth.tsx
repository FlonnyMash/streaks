import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGitHub: () => Promise<{ error: string | null }>
  signInWithPasskey: () => Promise<{ error: string | null }>
  registerPasskey: () => Promise<{ error: string | null }>
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function redirectTo(path: string) {
  return `${window.location.origin}${path}`
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      },
      async signUpWithPassword(email, password) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo('/auth/callback') },
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
          return { error: errorMessage(err) }
        }
      },
      async signInWithPasskey() {
        try {
          const { error } = await supabase.auth.signInWithPasskey()
          return { error: error?.message ?? null }
        } catch (err) {
          return { error: errorMessage(err) }
        }
      },
      async registerPasskey() {
        try {
          const { error } = await supabase.auth.registerPasskey()
          return { error: error?.message ?? null }
        } catch (err) {
          return { error: errorMessage(err) }
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
