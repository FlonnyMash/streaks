# Mashed Personal Dashboard — Setup Guide

This app is a static React SPA that talks directly to [Supabase](https://supabase.com) for
authentication and data storage, and deploys as a static site to Cloudflare Pages. There is
no custom backend server to run or host.

Follow the steps below in order.

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project (any region/plan works, the free tier is enough to start).
2. Once it's provisioned, open **Project Settings → API**. You'll need two values later:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public** API key

## 2. Create the database schema

1. In the Supabase dashboard, open the **SQL Editor**.
2. Open [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) from this repo, copy its full contents, paste into the SQL editor, and run it.
3. This creates:
   - `streaks` — one row per habit/streak a user creates
   - `streak_entries` — one row per day a streak is marked done
   - Row Level Security policies so every user can only ever see/edit their own data
   - A `delete_own_account()` function used by the in-app "Delete account" button

You can re-run this file safely; it uses `if not exists` / `drop policy if exists` guards.

If you set up your project before per-day notes/moods were added, also run
[`supabase/migrations/0004_entry_note_mood.sql`](supabase/migrations/0004_entry_note_mood.sql)
to add the `note` and `mood` columns to `streak_entries`.

If you set up your project before streak time tracking was added, also run
[`supabase/migrations/0005_streak_time_tracking.sql`](supabase/migrations/0005_streak_time_tracking.sql)
to add `track_time`, `time_goal_minutes`, and `time_goal_period` to `streaks`, and a `minutes`
column to `streak_entries`.

If you want the Todos section, also run
[`supabase/migrations/0006_todos.sql`](supabase/migrations/0006_todos.sql) to create the `todos`
table and its Row Level Security policies.

If your todos table was created before importance levels were added, also run
[`supabase/migrations/0008_todo_importance.sql`](supabase/migrations/0008_todo_importance.sql)
to add the `importance` column (1=low, 2=medium, 3=high).

If you want the Timesheet section, also run
[`supabase/migrations/0007_timesheet.sql`](supabase/migrations/0007_timesheet.sql) to create the
`timesheet_workspaces` and `timesheet_entries` tables and their Row Level Security policies.

If your timesheet workspaces were created before custom quick-select times were added, also run
[`supabase/migrations/0009_workspace_quick_presets.sql`](supabase/migrations/0009_workspace_quick_presets.sql)
to add the `quick_presets` column (defaults to 15m, 30m, 1h, 2h, 4h, 8h).

If your timesheet entries were created before clock ranges were added, also run
[`supabase/migrations/0010_timesheet_entry_time_range.sql`](supabase/migrations/0010_timesheet_entry_time_range.sql)
to add nullable `start_time` and `end_time` columns.

To collect a first name + date of birth and enforce the 16+ age minimum, also run
[`supabase/migrations/0011_profiles.sql`](supabase/migrations/0011_profiles.sql). This creates a
`profiles` table, a trigger that auto-creates a profile (and grandfathers existing accounts with
`onboarding_required = false`), and a trigger that rejects a date of birth under 16 years old or
any attempt to change one that's already set.

To let users upload a custom profile photo from Settings, also run
[`supabase/migrations/0012_profile_avatar.sql`](supabase/migrations/0012_profile_avatar.sql). This
adds an `avatar_url` column to `profiles` and creates a public `avatars` Storage bucket with
policies that only let each user write to their own `{user_id}/...` path.

For cross-device timesheet clock-in/out, also run
[`supabase/migrations/0013_timesheet_sessions.sql`](supabase/migrations/0013_timesheet_sessions.sql)
and [`supabase/migrations/0014_timesheet_sessions_multi.sql`](supabase/migrations/0014_timesheet_sessions_multi.sql).
These create `timesheet_sessions` (one open timer per workspace) with RLS, Realtime, and a
`server_now()` helper so elapsed time matches across devices.

To store an optional mood on timesheet entries (asked on clock-out), also run
[`supabase/migrations/0016_timesheet_entry_mood.sql`](supabase/migrations/0016_timesheet_entry_mood.sql).

For todo topics (tags), also run
[`supabase/migrations/0015_todo_topics.sql`](supabase/migrations/0015_todo_topics.sql). This creates
`todo_topics` and `todo_topic_links` with RLS so each user can tag their own tasks.

For Web Push reminders, also run
[`supabase/migrations/0022_push_notifications.sql`](supabase/migrations/0022_push_notifications.sql)
and [`supabase/migrations/0023_push_dispatch_cron.sql`](supabase/migrations/0023_push_dispatch_cron.sql)
(or `supabase db push`). Migration `0022` adds tables/columns; `0023` enables `pg_cron` / `pg_net` and
schedules the 15‑minute dispatch job. Then complete **§10. Web Push** (VAPID keys, function secrets,
and the one Vault secret for the cron Bearer token).

## 3. Configure Auth URLs

In **Authentication → URL Configuration**:

- **Site URL**: your production URL (e.g. `https://streaks.pages.dev`) — you can update this after your first Cloudflare Pages deploy.
- **Redirect URLs**: add all URLs your app can run on, for example:
  - `http://localhost:5173/**` (local dev)
  - `https://streaks.pages.dev/**` (production)
  - `https://*.streaks.pages.dev/**` (Cloudflare Pages preview deployments, if you want previews to support auth redirects)

## 4. Email/password auth

Enabled by default — no action needed. Optional: in **Authentication → Providers → Email**, you can toggle "Confirm email" off if you want new users to be signed in immediately without clicking a confirmation link (fine for testing, recommended ON for production).

### Password strength (recommended)

The app already rejects weak passwords client-side (min 8 chars, upper + lower + number + symbol, plus a small common-password blocklist). Mirror the same rules in Supabase so they can't be bypassed via the API:

1. Open **Authentication → Providers → Email** (or **Authentication → Password** / security settings, depending on dashboard layout).
2. Set **Minimum password length** to `8`.
3. Under required characters, require **digits, lowercase, uppercase, and symbols**.
4. If you're on Pro or above, enable **Prevent use of leaked passwords** (HaveIBeenPwned).

### Custom email templates

Branded HTML lives in [`supabase/templates/`](supabase/templates/). These are versioned source files — they are **not** applied automatically. Paste each file into the matching slot at **Authentication → Email Templates**:

| File | Dashboard slot |
|---|---|
| `confirmation.html` | Confirm sign up |
| `invite.html` | Invite user |
| `magic_link.html` | Magic link |
| `email_change.html` | Change email address |
| `recovery.html` | Reset password |
| `reauthentication.html` | Reauthentication |
| `password_changed.html` | Password changed |
| `email_changed.html` | Email address changed |
| `phone_changed.html` | Phone number changed |
| `identity_linked.html` | Sign-in method linked |
| `identity_unlinked.html` | Sign-in method removed |
| `mfa_factor_enrolled.html` | MFA method added |
| `mfa_factor_unenrolled.html` | MFA method removed |

The subject line is in an HTML comment at the top of each file — copy that into the **Subject** field separately (do not paste the comment into the body).

Keep **Site URL** set to your production origin so `{{ .SiteURL }}` resolves the logo (`/icon-192.png`) and the Privacy / Imprint links.

Security notification emails only send if their toggles are enabled on that same page.

## 5. GitHub sign-in

1. Go to [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) and click **New OAuth App** (this can be a personal account or an organization).
2. Fill in:
   - **Application name**: anything, e.g. `Mashed Personal Dashboard`
   - **Homepage URL**: your production URL (e.g. `https://streaks.pages.dev`), `http://localhost:5173` works fine while developing
   - **Authorization callback URL**: your Supabase callback URL:
     `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Click **Register application**, then **Generate a new client secret**. Copy the **Client ID** and **Client Secret**.
4. In Supabase: **Authentication → Providers → GitHub** — enable it and paste the Client ID/Secret. Save.

## 6. Passkeys (optional, beta/experimental)

Supabase Passkey support is currently in beta. To enable it:

1. In Supabase: **Authentication → Passkeys**, toggle **Enable Passkey authentication**.
2. Set the **Relying Party ID** to your app's domain (e.g. `streaks.pages.dev`, or your custom domain) and add all origins that should be allowed (`https://streaks.pages.dev`, `http://localhost:5173` for local testing, etc.).
3. Passkeys registered on one domain won't work on another, so update this whenever your domain changes (e.g. after adding a custom domain).

Since this is a beta API, it may change without notice — if it breaks, the rest of the app (email/password, GitHub) is unaffected.

## 7. Local development

1. Copy the example env file and fill in your Supabase values:

   ```bash
   cp .env.example .env.local
   ```

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   VITE_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
   ```

2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173`.

## 8. Deploy to Cloudflare Pages

1. Push this repository to GitHub (or GitLab).
2. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to **Workers & Pages → Create application → Pages → Import an existing Git repository**, and select your repo.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Vite (or None) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

4. Under **Environment variables**, add for **both Production and Preview**:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `VITE_VAPID_PUBLIC_KEY` | VAPID **public** key (see §10) |

   These are baked into the JS bundle at build time, so Cloudflare needs them set *before* it builds — not just at runtime.

5. Click **Save and Deploy**. Your app will be live at `https://<project-name>.pages.dev`.
6. Client-side routing (e.g. refreshing `/streaks/some-id`) is handled by [`public/_redirects`](public/_redirects), which is already included and copied into `dist` automatically.

### After your first deploy

Go back to Supabase and:

- Add `https://<project-name>.pages.dev/**` to **Authentication → URL Configuration → Redirect URLs**.
- If using GitHub sign-in, no extra change is needed there (its redirect always points at Supabase, not at your Pages domain).
- If using Passkeys, add your `.pages.dev` domain (and any custom domain) to the allowed origins in **Authentication → Passkeys**.
- If you add a custom domain in Cloudflare Pages later, repeat the two bullets above for that domain too.

## 9. PWABuilder and Google Play

The live site is [https://mashedstreaks.pages.dev](https://mashedstreaks.pages.dev). After each deploy:

1. Confirm `https://mashedstreaks.pages.dev/manifest.json` and a service worker (`sw.js` from the production build) are served over HTTPS.
2. Re-run the site on [pwabuilder.com](https://www.pwabuilder.com).
3. Use **Package → Google Play** to generate the Trusted Web Activity (TWA).

Suggested Android package name (change it in PWABuilder if you prefer a domain you own): `dev.pages.mashedstreaks.twa`.

### Screenshots

[`public/manifest.json`](public/manifest.json) expects these files (replace the placeholders with real signed-in captures before store submission):

| File | Current pixels | Form factor |
| --- | --- | --- |
| `public/screenshots/narrow-1080x1920.png` | 1290×2796 | Phone portrait |
| `public/screenshots/wide-1920x1080.png` | 1920×1080 | Desktop / tablet landscape |

Keep the filenames. If you replace the images, update the matching `sizes` values in [`public/manifest.json`](public/manifest.json) — PWABuilder rejects screenshots when `sizes` doesn’t match the real pixel dimensions.

### Digital Asset Links

Play / TWA URL verification needs [`public/.well-known/assetlinks.json`](public/.well-known/assetlinks.json) on the live origin.

1. Generate the Android package in PWABuilder (or Bubblewrap).
2. Copy the **SHA-256** fingerprint from Play App Signing (or the keystore PWABuilder shows).
3. Replace `REPLACE_WITH_PLAY_SIGNING_SHA256` in `assetlinks.json`.
4. Confirm `package_name` matches the package you submitted.
5. Redeploy, then verify at `https://mashedstreaks.pages.dev/.well-known/assetlinks.json`.

iOS App Store packaging is a later step (PWABuilder iOS wrapper or Capacitor). This setup is for the web PWA and Google Play.

## 10. Web Push (reminders)

Push uses the Web Push protocol (VAPID) and the `push-dispatch` Edge Function. Users allow
notifications on the **device** (browser/OS permission), then enable **Notify me** on individual
streaks/todos. The app reads `Notification.permission` and refreshes the user’s timezone from the
device whenever the app is opened (so travel updates reminder times).

### Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

- Put the **public** key in `VITE_VAPID_PUBLIC_KEY` (local `.env.local` and Cloudflare Pages).
- Put the **private** key only in Supabase function secrets (never in the frontend).

### Deploy the Edge Function

```bash
supabase functions deploy push-dispatch
supabase secrets set \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  VAPID_SUBJECT="mailto:kontakt@lucabakan.de" \
  PUSH_DISPATCH_SECRET="generate-a-long-random-string"
```

`supabase/config.toml` sets `verify_jwt = false` for this function because callers authenticate with
`PUSH_DISPATCH_SECRET` instead of end-user JWTs. Keep that secret out of the browser.

### Schedule automatic dispatch (every 15 minutes)

Migration [`0023_push_dispatch_cron.sql`](supabase/migrations/0023_push_dispatch_cron.sql) enables
`pg_cron` + `pg_net`, stores the project URL in Vault, and schedules
`push-dispatch-every-15m`. Apply it with:

```bash
supabase db push
```

**One extra step (cannot live in git):** put the same value as `PUSH_DISPATCH_SECRET` into Vault so
the cron job can authorize the Edge Function:

```sql
-- Run once in the SQL editor (use your real secret string):
select vault.create_secret('your-long-random-string', 'push_dispatch_secret');
```

If you already created that Vault secret under a different name, either recreate it as
`push_dispatch_secret` or change the cron command in a follow-up migration.

Confirm the job under **Integrations → Cron** (or `select * from cron.job`).

### Manual send (operator)

Send to all users with push enabled:

```bash
curl -X POST "https://YOUR-PROJECT-REF.supabase.co/functions/v1/push-dispatch" \
  -H "Authorization: Bearer YOUR_PUSH_DISPATCH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode":"manual","title":"Hello","body":"Test notification","url":"/"}'
```

Target one user by adding `"user_id":"<uuid>"`.

### Automatic rules (summary)

| Kind | When |
| --- | --- |
| Streak | Notify-me streaks, within ~15m of `notify_time` local, on a due day, not completed today |
| Todo | Notify-me incomplete todos with `due_date` ≤ today, at/after 20:00 local, once per day until done |
| Timer | Running timesheet or todo timer ≥ 8h, then every 2h; skipped 00:00–06:00 local |

## Notes

- The anon key is safe to expose in client-side code — that's how Supabase is designed to be used. Access control is enforced by the Row Level Security policies in the SQL migration, not by hiding the key.
- Never put your Supabase **service role** key in this app or in any `VITE_*` variable — it bypasses Row Level Security entirely.
