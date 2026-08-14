import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { TriangleAlert, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useCompleteOnboarding } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabaseClient'
import { getErrorMessage } from '@/lib/errors'
import { isLikelyNetworkError } from '@/lib/offline/network'
import { MIN_AGE_YEARS, guessFirstNameFromUser, isOldEnough, isValidPastDate } from '@/lib/profile'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Spinner } from '@/components/ui/Spinner'

export function CompleteProfilePage() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const completeOnboarding = useCompleteOnboarding()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [prefilled, setPrefilled] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [underage, setUnderage] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (prefilled) return
    const known = profile?.first_name || guessFirstNameFromUser(user)
    if (known) {
      setFirstName(known)
      setPrefilled(true)
    }
  }, [profile, user, prefilled])

  if (profileLoading) return <Spinner />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName.trim()) {
      setError('Enter your first name.')
      return
    }
    if (!isValidPastDate(dateOfBirth)) {
      setError('Enter a valid date of birth.')
      return
    }
    if (!isOldEnough(dateOfBirth)) {
      setUnderage(true)
      return
    }

    try {
      await completeOnboarding.mutateAsync({ firstName: firstName.trim(), dateOfBirth })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (isLikelyNetworkError(err)) {
        setError('Network error — check your connection and try again.')
      } else {
        setError(getErrorMessage(err))
      }
    }
  }

  async function handleUnderageDelete() {
    setDeleting(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('delete_own_account')
    if (rpcError) {
      setError(rpcError.message)
      setDeleting(false)
      return
    }
    await signOut()
    navigate('/login', { replace: true })
  }

  if (underage) {
    return (
      <div className="min-h-full flex items-center justify-center px-5 safe-top safe-bottom">
        <div className="w-full max-w-sm glass-panel rounded-[28px] p-6">
          <div className="flex flex-col items-center mb-4">
            <div className="size-12 rounded-2xl bg-accent-red/15 flex items-center justify-center mb-3">
              <TriangleAlert className="size-6 text-accent-red" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-center">Age requirement not met</h1>
          </div>
          <p className="text-[14px] text-black/60 dark:text-white/60 text-center leading-relaxed mb-5">
            You must be at least {MIN_AGE_YEARS} years old to use this app. Since you don't meet this
            requirement, this account can't be kept and will be deleted.
          </p>
          {error && <p className="text-[13px] text-accent-red text-center mb-3">{error}</p>}
          <div className="flex flex-col gap-2.5">
            <Button
              variant="danger"
              size="lg"
              className="w-full"
              loading={deleting}
              onClick={handleUnderageDelete}
            >
              Delete account &amp; sign out
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              disabled={deleting}
              onClick={() => setUnderage(false)}
            >
              Go back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex items-center justify-center px-5 py-10 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-[22px] bg-gradient-to-br from-accent-blue to-accent-indigo flex items-center justify-center shadow-[0_12px_30px_-8px_rgba(10,132,255,0.5)] mb-4">
            <UserRound className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">Complete your profile</h1>
          <p className="text-black/50 dark:text-white/50 text-[15px] mt-1 text-center">
            Confirm your name and add your date of birth to finish setting up your account.
          </p>
        </div>

        <div className="glass-panel rounded-[28px] p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <TextField
              label="First name"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
            />
            <TextField
              label="Date of birth"
              type="date"
              autoComplete="bday"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-[12px] text-black/40 dark:text-white/40 -mt-2">
              You must be at least {MIN_AGE_YEARS}. Your date of birth can't be changed later.
            </p>

            {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}

            <Button type="submit" size="lg" loading={completeOnboarding.isPending} className="w-full mt-1">
              Continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
