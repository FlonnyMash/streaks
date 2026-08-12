import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, Fingerprint, KeyRound, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { LegalFooterLinks } from '@/components/legal/LegalShared'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.03 11.03 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    const result =
      mode === 'login'
        ? await auth.signInWithPassword(email, password)
        : await auth.signUpWithPassword(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (mode === 'signup') {
      setNotice('Check your inbox to confirm your email, then sign in.')
      return
    }
    navigate('/', { replace: true })
  }

  async function handleReset() {
    if (!email) {
      setError('Enter your email above first.')
      return
    }
    setError(null)
    const result = await auth.sendPasswordReset(email)
    setNotice(result.error ?? 'Password reset email sent — check your inbox.')
  }

  async function handleGitHub() {
    setError(null)
    const result = await auth.signInWithGitHub()
    if (result.error) setError(result.error)
  }

  async function handleGoogle() {
    setError(null)
    const result = await auth.signInWithGoogle()
    if (result.error) setError(result.error)
  }

  async function handlePasskey() {
    setError(null)
    setPasskeyLoading(true)
    const result = await auth.signInWithPasskey()
    setPasskeyLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-full flex items-center justify-center px-5 py-10 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-[22px] bg-gradient-to-br from-accent-orange to-accent-red flex items-center justify-center shadow-[0_12px_30px_-8px_rgba(255,69,58,0.5)] mb-4">
            <Flame className="size-8 text-white" fill="white" fillOpacity={0.3} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="text-black/50 dark:text-white/50 text-[15px] mt-1">
            {mode === 'login' ? 'Sign in to keep your streaks alive' : 'Start building better habits today'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-2xl bg-accent-yellow/15 border border-accent-yellow/30 px-4 py-3 text-[13px] text-center">
            Supabase isn't configured yet. Add your project URL and anon key to <code>.env.local</code> — see{' '}
            <code>SETUP.md</code>.
          </div>
        )}

        <div className="glass-panel rounded-[28px] p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setShowReset((v) => !v)}
                className="text-[13px] text-accent-blue text-right -mt-1.5"
              >
                Forgot password?
              </button>
            )}
            {showReset && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[13px] text-black/50 dark:text-white/50 underline text-right -mt-2"
              >
                Send reset link to {email || 'your email'}
              </button>
            )}

            {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}
            {notice && <p className="text-[13px] text-accent-green text-center">{notice}</p>}

            <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
              <Mail className="size-4" />
              {mode === 'login' ? 'Sign in' : 'Sign up'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            <span className="text-[12px] text-black/40 dark:text-white/40">or continue with</span>
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          <div className="flex flex-col gap-2.5">
            <Button variant="secondary" size="md" className="w-full" onClick={handleGoogle}>
              <GoogleIcon />
              Google
            </Button>
            <Button variant="secondary" size="md" className="w-full" onClick={handleGitHub}>
              <GitHubIcon />
              GitHub
            </Button>
            {mode === 'login' && (
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                loading={passkeyLoading}
                onClick={handlePasskey}
              >
                <Fingerprint className="size-4" />
                Sign in with a Passkey
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-[14px] text-black/50 dark:text-white/50 mt-5">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <Link to="/signup" className="text-accent-blue font-medium">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="text-accent-blue font-medium">
                Sign in
              </Link>
            </>
          )}
        </p>

        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-black/35 dark:text-white/35 mt-6">
          <KeyRound className="size-3.5" />
          Secured by Supabase Auth
        </p>

        <LegalFooterLinks className="sm:hidden mt-4" />
      </div>
    </div>
  )
}
