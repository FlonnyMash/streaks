import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, LogOut, Mail, Trash2, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [passkeyMsg, setPasskeyMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function registerPasskeyForDevice() {
    try {
      const { error } = await supabase.auth.registerPasskey()
      return { error: error?.message ?? null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Passkeys are not enabled on this project yet.' }
    }
  }

  async function handleRegisterPasskey() {
    setPasskeyMsg(null)
    const { error } = await registerPasskeyForDevice()
    setPasskeyMsg(error ?? 'Passkey registered! You can now sign in with it.')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight mb-6">Settings</h1>

      <div className="glass-panel rounded-[24px] p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-accent-blue/15 flex items-center justify-center">
            <Mail className="size-5 text-accent-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-black/45 dark:text-white/45">Signed in as</p>
            <p className="font-medium truncate">{user?.email ?? 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[24px] p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-12 rounded-2xl bg-accent-indigo/15 flex items-center justify-center">
            <Fingerprint className="size-5 text-accent-indigo" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Passkeys</p>
            <p className="text-[13px] text-black/45 dark:text-white/45">
              Register this device for faster, passwordless sign-in.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRegisterPasskey}>
          Register a passkey
        </Button>
        {passkeyMsg && <p className="text-[13px] text-black/60 dark:text-white/60 mt-2">{passkeyMsg}</p>}
      </div>

      <Button variant="secondary" size="md" className="w-full justify-start mb-4" onClick={() => signOut()}>
        <LogOut className="size-4" />
        Sign out
      </Button>

      <div className="glass-panel rounded-[24px] p-5 border border-accent-red/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-12 rounded-2xl bg-accent-red/15 flex items-center justify-center">
            <TriangleAlert className="size-5 text-accent-red" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Delete account</p>
            <p className="text-[13px] text-black/45 dark:text-white/45">
              Permanently deletes your account and every streak. This can't be undone.
            </p>
          </div>
        </div>

        {!confirmDelete ? (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            Delete my account
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            {deleteError && <p className="text-[13px] text-accent-red">{deleteError}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDeleteAccount}>
                Yes, delete everything
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
