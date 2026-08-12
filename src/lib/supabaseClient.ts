import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in your Supabase project credentials.',
  )
}

// Fall back to a syntactically valid placeholder so the client can construct
// without throwing when env vars are missing (e.g. first run before setup).
// Any real network calls will simply fail until real credentials are provided.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Passkeys are an experimental Supabase Auth feature (beta). Opting in here
    // enables `supabase.auth.registerPasskey()` / `signInWithPasskey()`.
    // See SETUP.md for how to enable Passkeys on your Supabase project.
    experimental: { passkey: true },
  },
})

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
