import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cake,
  Camera,
  ChevronRight,
  Fingerprint,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Pencil,
  RotateCcw,
  Scale,
  Sun,
  Trash2,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { useProfile, useRemoveAvatar, useSetDateOfBirth, useUpdateAvatar, useUpdateFirstName } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabaseClient'
import { getErrorMessage } from '@/lib/errors'
import {
  MIN_AGE_YEARS,
  getOAuthAvatarUrl,
  isOAuthOnlyAccount,
  isOldEnough,
  isValidPastDate,
  primaryProviderLabel,
} from '@/lib/profile'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Avatar } from '@/components/ui/Avatar'
import { LegalPickerModal } from '@/components/legal/LegalPickerModal'
import { AddToHomeScreenSettings } from '@/components/pwa/AddToHomeScreen'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

function formatDateOfBirth(value: string) {
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

const THEME_OPTIONS: { value: ThemeMode; label: string; hint: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', hint: 'Always light', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Always dark', icon: Moon },
  { value: 'system', label: 'System', hint: 'Match device', icon: Monitor },
]

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
  const { theme, setTheme } = useTheme()
  const { data: profile } = useProfile()
  const updateFirstName = useUpdateFirstName()
  const setDateOfBirth = useSetDateOfBirth()
  const updateAvatar = useUpdateAvatar()
  const removeAvatar = useRemoveAvatar()
  const navigate = useNavigate()

  const oauthOnly = isOAuthOnlyAccount(user)
  const oauthAvatarUrl = getOAuthAvatarUrl(user)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be smaller than 5 MB.')
      return
    }
    setAvatarError(null)
    try {
      await updateAvatar.mutateAsync(file)
    } catch (err) {
      setAvatarError(getErrorMessage(err))
    }
  }

  async function handleResetAvatar() {
    setAvatarError(null)
    try {
      await removeAvatar.mutateAsync()
    } catch (err) {
      setAvatarError(getErrorMessage(err))
    }
  }

  const [editingName, setEditingName] = useState(false)
  const [firstNameDraft, setFirstNameDraft] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailNotice, setEmailNotice] = useState<string | null>(null)

  const [dobDraft, setDobDraft] = useState('')
  const [dobError, setDobError] = useState<string | null>(null)

  function startEditingName() {
    setNameError(null)
    setFirstNameDraft(profile?.first_name ?? '')
    setEditingName(true)
  }

  async function handleSaveFirstName() {
    const trimmed = firstNameDraft.trim()
    if (!trimmed) {
      setNameError('First name cannot be empty.')
      return
    }
    setNameError(null)
    try {
      await updateFirstName.mutateAsync(trimmed)
      setEditingName(false)
    } catch (err) {
      setNameError(getErrorMessage(err))
    }
  }

  function startEditingEmail() {
    setEmailError(null)
    setEmailNotice(null)
    setEmailDraft(user?.email ?? '')
    setEditingEmail(true)
  }

  async function handleSaveEmail() {
    const trimmed = emailDraft.trim()
    if (!trimmed) {
      setEmailError('Enter an email address.')
      return
    }
    setEmailError(null)
    setEmailSaving(true)
    const { error } = await supabase.auth.updateUser({ email: trimmed })
    setEmailSaving(false)
    if (error) {
      setEmailError(error.message)
      return
    }
    setEditingEmail(false)
    setEmailNotice('Check your inbox to confirm the new email address.')
  }

  async function handleSaveDateOfBirth() {
    if (!isValidPastDate(dobDraft)) {
      setDobError('Enter a valid date of birth.')
      return
    }
    if (!isOldEnough(dobDraft)) {
      setDobError(`You must be at least ${MIN_AGE_YEARS} years old to use this app.`)
      return
    }
    setDobError(null)
    try {
      await setDateOfBirth.mutateAsync(dobDraft)
    } catch (err) {
      setDobError(getErrorMessage(err))
    }
  }

  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [passkeysLoading, setPasskeysLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [passkeyMsg, setPasskeyMsg] = useState<string | null>(null)
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [legalOpen, setLegalOpen] = useState(false)

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
        <p className="text-[13px] font-semibold text-black/45 dark:text-white/45 mb-4">Profile</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative shrink-0">
            <Avatar src={profile?.avatar_url ?? oauthAvatarUrl} name={profile?.first_name} size="xl" />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={updateAvatar.isPending}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 size-7 rounded-full bg-accent-blue text-white flex items-center justify-center ring-2 ring-white dark:ring-black shadow-sm active:scale-90 transition-transform disabled:opacity-60"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Profile photo</p>
            <p className="text-[13px] text-black/45 dark:text-white/45 mb-2">
              {updateAvatar.isPending ? 'Uploading…' : 'Shown in the top-right of the app.'}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" loading={updateAvatar.isPending} onClick={() => avatarInputRef.current?.click()}>
                <Camera className="size-3.5" />
                Change photo
              </Button>
              {profile?.avatar_url && oauthAvatarUrl && (
                <Button size="sm" variant="ghost" loading={removeAvatar.isPending} onClick={handleResetAvatar}>
                  <RotateCcw className="size-3.5" />
                  Reset to {primaryProviderLabel(user)} photo
                </Button>
              )}
            </div>
          </div>
        </div>
        {avatarError && <p className="text-[13px] text-accent-red mb-4 -mt-2">{avatarError}</p>}

        {/* First name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-12 rounded-2xl bg-accent-blue/15 flex items-center justify-center shrink-0">
            <UserRound className="size-5 text-accent-blue" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-black/45 dark:text-white/45">First name</p>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <TextField
                  value={firstNameDraft}
                  onChange={(e) => setFirstNameDraft(e.target.value)}
                  className="h-10 flex-1"
                  autoFocus
                />
                <Button size="sm" loading={updateFirstName.isPending} onClick={handleSaveFirstName}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="font-medium truncate">{profile?.first_name || 'Not set'}</p>
            )}
          </div>
          {!editingName && (
            <Button variant="ghost" size="sm" onClick={startEditingName} aria-label="Edit first name">
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
        {editingName && nameError && <p className="text-[13px] text-accent-red mb-4 -mt-2">{nameError}</p>}

        {/* Email */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-12 rounded-2xl bg-accent-orange/15 flex items-center justify-center shrink-0">
            <Mail className="size-5 text-accent-orange" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-black/45 dark:text-white/45">Email</p>
            {editingEmail ? (
              <div className="flex items-center gap-2 mt-1">
                <TextField
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="h-10 flex-1"
                  autoFocus
                />
                <Button size="sm" loading={emailSaving} onClick={handleSaveEmail}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingEmail(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="font-medium truncate">{user?.email ?? 'Unknown'}</p>
            )}
          </div>
          {!editingEmail && !oauthOnly && (
            <Button variant="ghost" size="sm" onClick={startEditingEmail} aria-label="Edit email">
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
        {!editingEmail && oauthOnly && (
          <p className="text-[12px] text-black/40 dark:text-white/40 mb-4 -mt-2">
            Managed by {primaryProviderLabel(user)} — sign-in email can't be changed here.
          </p>
        )}
        {editingEmail && emailError && <p className="text-[13px] text-accent-red mb-4 -mt-2">{emailError}</p>}
        {!editingEmail && emailNotice && (
          <p className="text-[13px] text-accent-green mb-4 -mt-2">{emailNotice}</p>
        )}

        {/* Date of birth */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-12 rounded-2xl bg-accent-pink/15 flex items-center justify-center shrink-0">
            <Cake className="size-5 text-accent-pink" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-black/45 dark:text-white/45">Date of birth</p>
            {profile?.date_of_birth ? (
              <p className="font-medium truncate">{formatDateOfBirth(profile.date_of_birth)}</p>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <TextField
                  type="date"
                  value={dobDraft}
                  onChange={(e) => setDobDraft(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="h-10 flex-1"
                />
                <Button size="sm" loading={setDateOfBirth.isPending} onClick={handleSaveDateOfBirth}>
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
        {!profile?.date_of_birth && (
          <p className="text-[12px] text-black/40 dark:text-white/40 mb-4 -mt-2">
            You must be at least {MIN_AGE_YEARS}. This can't be changed once saved.
          </p>
        )}
        {dobError && <p className="text-[13px] text-accent-red mb-4 -mt-2">{dobError}</p>}

        <Button variant="secondary" size="md" className="w-full justify-start" onClick={() => signOut()}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>

      <div className="glass-panel rounded-[24px] p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-12 rounded-2xl bg-accent-orange/15 flex items-center justify-center">
            <Sun className="size-5 text-accent-orange" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Appearance</p>
            <p className="text-[13px] text-black/45 dark:text-white/45">
              Choose light, dark, or follow your device setting.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const selected = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'rounded-2xl px-2 py-2.5 text-center transition-all',
                  selected
                    ? 'bg-accent-blue/12 ring-2 ring-accent-blue'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]',
                )}
              >
                <Icon className="size-4 mx-auto mb-1 opacity-80" />
                <div className="text-[13px] font-semibold">{opt.label}</div>
                <div className="text-[11px] text-black/45 dark:text-white/45 mt-0.5">{opt.hint}</div>
              </button>
            )
          })}
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

      <AddToHomeScreenSettings />

      <section className="sm:hidden mb-4">
        <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide mb-2 px-1">
          Legal
        </h2>
        <button
          type="button"
          onClick={() => setLegalOpen(true)}
          className="w-full glass-panel rounded-[24px] p-5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
        >
          <div className="size-12 rounded-2xl bg-accent-teal/15 flex items-center justify-center shrink-0">
            <Scale className="size-5 text-accent-teal" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Legal</p>
            <p className="text-[13px] text-black/45 dark:text-white/45">
              Privacy Policy and Imprint
            </p>
          </div>
          <ChevronRight className="size-4 text-black/30 dark:text-white/30 shrink-0" />
        </button>
        <LegalPickerModal open={legalOpen} onClose={() => setLegalOpen(false)} />
      </section>

      <section>
        <h2 className="text-[13px] font-semibold text-black/45 dark:text-white/45 uppercase tracking-wide mb-2 px-1">
          Danger zone
        </h2>
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
      </section>
    </div>
  )
}
