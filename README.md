# Mashed Personal Dashboard

A personal dashboard with a clean, Apple-inspired, glassmorphic interface — optimized for both
mobile and desktop. It's organized as a hub of sections:

- **Streaks** — habit and custom streak tracking, with optional time-based goals
- **Todos** — a lightweight checklist for one-off tasks, each with its own play/pause timer

> The former **Timesheet** feature (per-project time logging) has been archived to
> [`_archived_timesheet_feature/`](_archived_timesheet_feature/) to keep this app focused on
> Streaks and Todos. See that folder's `REUSE_GUIDE.md` if you want to build it into a
> standalone app later.

Built with React, TypeScript, Vite, and Tailwind CSS, backed by [Supabase](https://supabase.com)
for auth and data storage, and deployed as a static site to Cloudflare Pages.

## Features

### Streaks

- Create unlimited streak types, each with its own emoji, accent color, and schedule
- Three scheduling modes: daily, specific weekdays, or X times per week
- Optional time tracking: log minutes spent each day, and optionally require a daily, weekly, or
  monthly time goal instead of a plain checkbox — hitting the goal is what completes the streak
- Per-streak monthly calendar — tap a day to mark it complete or log time
- Current streak, longest streak, completion-rate, and total-time stats

### Todos

- Quick-add bar plus a per-task edit modal for notes and due dates
- Automatically grouped into Overdue, Today, Upcoming, and No date sections
- Manual reordering within a section, and a collapsible Completed section
- Optional topics work like tags, and each task has its own play/pause timer

### Platform

- Email/password and GitHub sign-in, plus experimental passkey support
- Every account's data is private, enforced by Postgres Row Level Security
- Responsive: frosted-glass top nav on desktop, frosted-glass bottom tab bar on mobile
- Light and dark mode — choose in Settings, or follow system preference
- Installable PWA (web app manifest + service worker), packaged for Google Play via [PWABuilder](https://www.pwabuilder.com)

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
    layout/      # Glass navbar (desktop) + glass tab bar (mobile) + shared empty states
    streaks/     # Streak card, calendar, stats, create/edit modal
    todos/       # Todo list item, create/edit modal
    ui/          # Shared buttons, inputs, modal primitives
  hooks/         # useAuth, useStreaks/useStreakEntries, useTodos, useTodoTimer (Supabase + React Query)
  lib/           # Supabase client, streak/todo math, types, accent colors
  pages/         # Route-level pages (Streaks, Todos, Settings, auth)
supabase/
  migrations/    # SQL schema + RLS policies
_archived_timesheet_feature/  # Former Timesheet feature, kept for future reuse (see its REUSE_GUIDE.md)
```

## Deployment

Deployed to Cloudflare Pages as a static site:

- Build command: `npm run build`
- Build output directory: `dist`
- Required environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Full details in [`SETUP.md`](SETUP.md), including PWABuilder / Google Play packaging.
