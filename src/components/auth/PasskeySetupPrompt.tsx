import { useEffect, useState } from 'react'
import { Fingerprint, ShieldCheck, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import {
  getPasskeyPromptState,
  isFirstLogin,
  setPasskeyPromptState,
} from '@/lib/passkeyPrompt'
import { GlassModal } from '@/components/ui/GlassModal'
import { Button } from '@/components/ui/Button'

export function PasskeySetupPrompt() {
  const { user, registerPasskey, ensureSession } = useAuth()
  const [open, setOpen] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const userId = user.id
    if (getPasskeyPromptState(userId)) return
    if (!isFirstLogin(user.created_at, user.last_sign_in_at)) return

    let cancelled = false

    async function checkPasskeys() {
      const ensured = await ensureSession()
      if (cancelled || ensured.error) return

      const { data, error: listError } = await supabase.auth.passkey.list()
      if (cancelled) return

      if (listError) return

      if (data && data.length > 0) {
        setPasskeyPromptState(userId, 'completed')
        return
      }

      setOpen(true)
    }

    void checkPasskeys()

    return () => {
      cancelled = true
    }
  }, [user, ensureSession])

  function dismiss() {
    if (!user) return
    setPasskeyPromptState(user.id, 'dismissed')
    setOpen(false)
    setError(null)
  }

  async function handleSetup() {
    if (!user) return
    setError(null)
    setRegistering(true)
    const { error: registerError } = await registerPasskey()
    setRegistering(false)

    if (registerError) {
      setError(registerError)
      return
    }

    setPasskeyPromptState(user.id, 'completed')
    setOpen(false)
  }

  return (
    <GlassModal open={open} onClose={dismiss} title="Set up a passkey?">
      <div className="flex flex-col gap-5">
        <div className="flex justify-center">
          <div className="size-14 rounded-2xl bg-accent-blue/15 flex items-center justify-center">
            <Fingerprint className="size-7 text-accent-blue" />
          </div>
        </div>

        <p className="text-[15px] text-black/70 dark:text-white/70 text-center leading-relaxed">
          Passkeys let you sign in with your fingerprint, face, or device PIN — no password to
          remember. They stay on your device and are much harder to phish than passwords.
        </p>

        <ul className="flex flex-col gap-3">
          <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
            <Zap className="size-4 shrink-0 mt-0.5 text-accent-orange" />
            <span>Sign in faster next time with one tap</span>
          </li>
          <li className="flex items-start gap-3 text-[14px] text-black/65 dark:text-white/65">
            <ShieldCheck className="size-4 shrink-0 mt-0.5 text-accent-green" />
            <span>More secure than passwords — resistant to phishing</span>
          </li>
        </ul>

        {error && <p className="text-[13px] text-accent-red text-center">{error}</p>}

        <div className="flex flex-col gap-2.5 pt-1">
          <Button size="lg" className="w-full" loading={registering} onClick={handleSetup}>
            <Fingerprint className="size-4" />
            Set up passkey
          </Button>
          <Button variant="ghost" size="md" className="w-full" onClick={dismiss} disabled={registering}>
            Maybe later
          </Button>
        </div>
      </div>
    </GlassModal>
  )
}
