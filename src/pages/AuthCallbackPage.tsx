import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Spinner } from '@/components/ui/Spinner'

export function AuthCallbackPage() {
  const { session, loading, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isRecovery = searchParams.get('type') === 'recovery'

  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!isRecovery && session) navigate('/', { replace: true })
    if (!loading && !session && !isRecovery) navigate('/login', { replace: true })
  }, [loading, session, isRecovery, navigate])

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => navigate('/', { replace: true }), 1200)
    }
  }

  if (isRecovery && user) {
    return (
      <div className="min-h-full flex items-center justify-center px-5 safe-top safe-bottom">
        <div className="w-full max-w-sm glass-panel rounded-[28px] p-6">
          <div className="flex flex-col items-center mb-4">
            <div className="size-12 rounded-2xl bg-accent-blue/15 flex items-center justify-center mb-3">
              <KeyRound className="size-6 text-accent-blue" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
          </div>
          <form onSubmit={handleSetPassword} className="flex flex-col gap-3.5">
            <TextField
              label="New password"
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}
            {done && <p className="text-[13px] text-accent-green text-center">Password updated — redirecting…</p>}
            <Button type="submit" size="lg" loading={saving} className="w-full">
              Update password
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return <Spinner />
}
