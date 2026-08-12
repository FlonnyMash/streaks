import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, LogOut, Mail, Trash2, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { getErrorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/Button'

type PasskeyItem = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

function formatPasskeyDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export function SettingsPage() {
  const { user, signOut, registerPasskey, ensureSession } = useAuth()
  const navigate = useNavigate()
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [passkeysLoading, setPasskeysLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [passkeyMsg, setPasskeyMsg] = useState<string | null>(null)
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadPasskeys = useCallback(async () => {
    setPasskeysLoading(true)
    setPasskeyError(null)
    try {
      const ensured = await ensureSession()
      if (ensured.error) {
        setPasskeyError(ensured.error)
        setPasskeys([])
        return
      }
      const { data, error } = await supabase.auth.passkey.list()
      if (error) {
        setPasskeyError(error.message)
        setPasskeys([])
        return
      }
      setPasskeys(data ?? [])
    } catch (err) {
      setPasskeyError(getErrorMessage(err, 'Could not load passkeys.'))
      setPasskeys([])
    } finally {
      setPasskeysLoading(false)
    }
  }, [ensureSession])

  useEffect(() => {
    void loadPasskeys()
  }, [loadPasskeys])

  async function handleRegisterPasskey() {
    setPasskeyMsg(null)
    setPasskeyError(null)
    setRegistering(true)
    const { error } = await registerPasskey()
    setRegistering(false)
    if (error) {
      setPasskeyError(error)
      return
    }
    setPasskeyMsg('Passkey registered! You can now sign in with it.')
    await loadPasskeys()
  }

  async function handleDeletePasskey(passkeyId: string) {
    setPasskeyMsg(null)
    setPasskeyError(null)
    setDeletingId(passkeyId)
    try {
      const ensured = await ensureSession()
      if (ensured.error) {
        setPasskeyError(ensured.error)
        return
      }
      const { error } = await supabase.auth.passkey.delete({ passkeyId })
      if (error) {
        setPasskeyError(error.message)
        return
      }
      setPasskeyMsg('Passkey removed.')
      await loadPasskeys()
    } catch (err) {
      setPasskeyError(getErrorMessage(err, 'Could not delete passkey.'))
    } finally {
      setDeletingId(null)
    }
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
              Register devices for faster, passwordless sign-in. You can remove any passkey below.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-3">
          {passkeysLoading && (
            <p className="text-[13px] text-black/45 dark:text-white/45">Loading passkeys…</p>
          )}
          {!passkeysLoading && passkeys.length === 0 && (
            <p className="text-[13px] text-black/45 dark:text-white/45">No passkeys registered yet.</p>
          )}
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium truncate">
                  {passkey.friendly_name?.trim() || 'Passkey'}
                </p>
                <p className="text-[12px] text-black/45 dark:text-white/45">
                  Added {formatPasskeyDate(passkey.created_at)}
                  {passkey.last_used_at ? ` · Last used ${formatPasskeyDate(passkey.last_used_at)}` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={deletingId === passkey.id}
                onClick={() => handleDeletePasskey(passkey.id)}
                aria-label={`Delete ${passkey.friendly_name || 'passkey'}`}
                className="text-accent-red shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="secondary" size="sm" loading={registering} onClick={handleRegisterPasskey}>
          Register a passkey
        </Button>
        {passkeyMsg && <p className="text-[13px] text-accent-green mt-2">{passkeyMsg}</p>}
        {passkeyError && <p className="text-[13px] text-accent-red mt-2">{passkeyError}</p>}
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
