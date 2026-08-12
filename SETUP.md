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

If you want the Timesheet section, also run
[`supabase/migrations/0007_timesheet.sql`](supabase/migrations/0007_timesheet.sql) to create the
`timesheet_workspaces` and `timesheet_entries` tables and their Row Level Security policies.

## 3. Configure Auth URLs

In **Authentication → URL Configuration**:

- **Site URL**: your production URL (e.g. `https://streaks.pages.dev`) — you can update this after your first Cloudflare Pages deploy.
- **Redirect URLs**: add all URLs your app can run on, for example:
  - `http://localhost:5173/**` (local dev)
  - `https://streaks.pages.dev/**` (production)
  - `https://*.streaks.pages.dev/**` (Cloudflare Pages preview deployments, if you want previews to support auth redirects)

## 4. Email/password auth

Enabled by default — no action needed. Optional: in **Authentication → Providers → Email**, you can toggle "Confirm email" off if you want new users to be signed in immediately without clicking a confirmation link (fine for testing, recommended ON for production).

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

   These are baked into the JS bundle at build time, so Cloudflare needs them set *before* it builds — not just at runtime.

5. Click **Save and Deploy**. Your app will be live at `https://<project-name>.pages.dev`.
6. Client-side routing (e.g. refreshing `/streaks/some-id`) is handled by [`public/_redirects`](public/_redirects), which is already included and copied into `dist` automatically.

### After your first deploy

Go back to Supabase and:

- Add `https://<project-name>.pages.dev/**` to **Authentication → URL Configuration → Redirect URLs**.
- If using GitHub sign-in, no extra change is needed there (its redirect always points at Supabase, not at your Pages domain).
- If using Passkeys, add your `.pages.dev` domain (and any custom domain) to the allowed origins in **Authentication → Passkeys**.
- If you add a custom domain in Cloudflare Pages later, repeat the two bullets above for that domain too.

## Notes

- The anon key is safe to expose in client-side code — that's how Supabase is designed to be used. Access control is enforced by the Row Level Security policies in the SQL migration, not by hiding the key.
- Never put your Supabase **service role** key in this app or in any `VITE_*` variable — it bypasses Row Level Security entirely.
