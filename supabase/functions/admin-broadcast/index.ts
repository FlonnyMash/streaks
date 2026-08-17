/**
 * admin-broadcast — JWT-gated proxy that lets the admin panel trigger a
 * manual Web Push send without ever exposing PUSH_DISPATCH_SECRET (or any
 * other push credential) to the browser.
 *
 * Auth: standard Supabase user JWT (Authorization: Bearer <access_token>).
 * `verify_jwt` stays at its platform default (true) — this function is
 * deliberately absent from supabase/config.toml, unlike push-dispatch. On
 * top of that platform check, this function independently re-verifies the
 * token and checks `admin_users` membership with the service-role client,
 * so a stolen or forged client-side "isAdmin" flag can never grant access.
 *
 * Body: { title: string, body: string, user_id?: string, url?: string }
 *
 * Secrets: PUSH_DISPATCH_SECRET, ADMIN_ORIGIN (comma-separated allowed
 * origins, e.g. "https://admin.flonny.app,http://localhost:5174")
 * Builtin: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = (Deno.env.get('ADMIN_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] ?? 'null'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    // supabase-js always sends apikey (+ often x-client-info); omitting them
    // makes the browser abort the preflight as a FunctionsFetchError.
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, headers)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return json(401, { error: 'Missing bearer token' }, headers)
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL')
    const anonKey = requireEnv('SUPABASE_ANON_KEY')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    // Re-verify the JWT ourselves (independent of the platform's verify_jwt
    // gate) and resolve the caller's identity from it.
    const authClient = createClient(supabaseUrl, anonKey)
    const { data: userData, error: userError } = await authClient.auth.getUser(token)
    if (userError || !userData?.user) {
      return json(401, { error: 'Invalid or expired session' }, headers)
    }
    const callerId = userData.user.id

    // Service-role client bypasses RLS so this check is authoritative
    // regardless of any admin_users policy — never trust a client claim.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: adminRow, error: adminError } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', callerId)
      .maybeSingle()

    if (adminError) {
      console.error('admin_users lookup failed', adminError)
      return json(500, { error: 'Could not verify admin status' }, headers)
    }
    if (!adminRow) {
      return json(403, { error: 'Admins only' }, headers)
    }

    const payload = await req.json().catch(() => ({}))
    const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
    const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
    if (!title || !body) {
      return json(400, { error: 'title and body are required' }, headers)
    }

    const dispatchSecret = requireEnv('PUSH_DISPATCH_SECRET')
    const dispatchResponse = await fetch(`${supabaseUrl}/functions/v1/push-dispatch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dispatchSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'manual',
        title,
        body,
        user_id: typeof payload?.user_id === 'string' && payload.user_id ? payload.user_id : undefined,
        url: typeof payload?.url === 'string' && payload.url ? payload.url : undefined,
      }),
    })

    const result = await dispatchResponse.json().catch(() => ({}))
    if (!dispatchResponse.ok) {
      return json(dispatchResponse.status, { error: result?.error ?? 'push-dispatch failed' }, headers)
    }

    return json(200, result, headers)
  } catch (err) {
    console.error(err)
    return json(500, { error: err instanceof Error ? err.message : 'Internal error' }, headers)
  }
})
