# Streaks

Track daily habits and custom streaks with a clean, Apple-inspired, glassmorphic interface —
optimized for both mobile and desktop. Each streak has its own calendar, current/longest streak
counters, and flexible scheduling (every day, specific weekdays, or N times per week).

Built with React, TypeScript, Vite, and Tailwind CSS, backed by [Supabase](https://supabase.com)
for auth and data storage, and deployed as a static site to Cloudflare Pages.

## Features

- Create unlimited streak types, each with its own emoji, accent color, and schedule
- Three scheduling modes: daily, specific weekdays, or X times per week
- Per-streak monthly calendar — tap a day to mark it complete
- Current streak, longest streak, and completion-rate stats
- Email/password and GitHub sign-in, plus experimental passkey support
- Every account's streaks are private, enforced by Postgres Row Level Security
- Responsive: frosted-glass top nav on desktop, frosted-glass bottom tab bar on mobile
- Light and dark mode (follows system preference)

## Tech stack

- [Vite](https://vite.dev) + [React](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) for styling
- [Supabase](https://supabase.com) (Auth + Postgres) — no custom backend needed
- [TanStack Query](https://tanstack.com/query) for data fetching/caching
- [date-fns](https://date-fns.org), [lucide-react](https://lucide.dev), [framer-motion](https://www.framer.com/motion/)

## Getting started

See [`SETUP.md`](SETUP.md) for the full walkthrough (Supabase project setup, OAuth providers,
Passkeys, and Cloudflare Pages deployment). Quick version:

```bash
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm install
npm run dev
```

## Project structure

```
src/
  components/
    auth/        # Login/signup form, protected route wrapper
    layout/      # Glass navbar (desktop) + glass tab bar (mobile)
    streaks/     # Streak card, calendar, stats, create/edit modal
    ui/          # Shared buttons, inputs, modal primitives
  hooks/         # useAuth, useStreaks, useStreakEntries (Supabase + React Query)
  lib/           # Supabase client, streak math, types, accent colors
  pages/         # Route-level pages
supabase/
  migrations/    # SQL schema + RLS policies
```

## Deployment

Deployed to Cloudflare Pages as a static site:

- Build command: `npm run build`
- Build output directory: `dist`
- Required environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Full details in [`SETUP.md`](SETUP.md).
