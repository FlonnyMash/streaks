# Timesheet Feature — Archive & Reuse Guide

This folder holds the **entire "Timesheet" feature** that was removed from the active
Streaks & Todos app on 2026-08-16. Nothing here is imported by `src/` anymore — the active
app builds and runs without this folder. It exists so a future standalone **Timesheet PWA**
can be bootstrapped quickly, reusing the same Supabase project (Auth, Profiles, and the
`timesheet_*` tables, which were **intentionally left in the database**).

Nothing in this folder is type-checked or bundled (`tsconfig.app.json` only includes `src`,
and Vite only builds from `src`), so it's safe to leave as read-only reference material.

## Folder layout

```
_archived_timesheet_feature/
  pages/                     # Route-level pages
  components/
    timesheet/                # Timesheet-specific UI
    dashboard/TimesheetTodayWidget.tsx
    todos/TodoTimePromptModal.tsx   # Todo -> Timesheet bridge (see below)
  hooks/                     # Data hooks + timer provider
  lib/
    timesheetLogic.ts        # Calendar grid, time parsing, presets, export stats
    timesheetPdf.ts          # jsPDF report generation
    types.ts                 # Timesheet-only TS interfaces (extracted from src/lib/types.ts)
  migrations/                # Copies of the applied Supabase migrations that created the schema
  REUSE_GUIDE.md             # This file
```

## 1. Core components and their purpose

| Component | Purpose |
| --- | --- |
| `pages/TimesheetPage.tsx` | Cross-workspace summary: workspace cards, aggregate calendar, clock-in, export |
| `pages/TimesheetWorkspacePage.tsx` | Single workspace: calendar, day entries, timer controls, edit/delete workspace |
| `components/dashboard/TimesheetTodayWidget.tsx` | Dashboard card: today/week totals, active timers, clock-in, per-workspace breakdown |
| `components/timesheet/WorkspaceCard.tsx` | Link card with today/week/month totals for one workspace |
| `components/timesheet/TimesheetCalendar.tsx` | Month grid with minutes heatmap; day selection |
| `components/timesheet/DaySummaryModal.tsx` | Cross-workspace day breakdown (from the summary page) |
| `components/timesheet/DayEntriesModal.tsx` | Full CRUD for entries on one day in one workspace |
| `components/timesheet/CreateWorkspaceModal.tsx` | Create/edit workspace (name, emoji, color, quick presets) |
| `components/timesheet/ClockInPickerModal.tsx` | Pick workspace + start now or backdated |
| `components/timesheet/ActiveTimerBanner.tsx` | Inline banner listing all active/paused workspace timers |
| `components/timesheet/StopTimerModal.tsx` | Clock-out flow: per-day breakdown, mood, save/discard |
| `components/timesheet/ReplacePausedTimerModal.tsx` | Resolves conflict when starting a timer while another is paused |
| `components/timesheet/ExportTimesheetModal.tsx` | Date-range picker + PDF download |
| `components/todos/TodoTimePromptModal.tsx` | After completing a todo with tracked time, offers to log it as a Timesheet entry |
| `hooks/useTimesheetWorkspaces.ts` | CRUD query/mutations for workspaces |
| `hooks/useTimesheetEntries.ts` | Per-workspace or all-workspace entries; offline outbox support |
| `hooks/useTimesheetTimer.tsx` | Global provider: start/pause/resume/stop; syncs `timesheet_sessions` + `timesheet_session_days`; localStorage cache |
| `lib/timesheetLogic.ts` | Month grid math, quick presets, clock-time parsing, PDF export stats |
| `lib/timesheetPdf.ts` | Builds the exported PDF via `jspdf` + `jspdf-autotable` |

Reinstall dependencies before reusing this code: `npm install jspdf jspdf-autotable`.

## 2. Database schema

All Timesheet tables **still exist** in the shared Supabase project (they were not dropped —
only the app-level FK `todos.workspace_id` was dropped, see §4). `migrations/` in this folder
has copies of the SQL that created them, applied in this order:

| Table | Created by | Notes |
| --- | --- | --- |
| `timesheet_workspaces` | `0007_timesheet.sql`, `0009_workspace_quick_presets.sql` | `id`, `user_id`, `name`, `emoji`, `color`, `quick_presets[]`, `archived`, `created_at` |
| `timesheet_entries` | `0007`, `0010`, `0016`, plus `updated_at` from `0024_updated_at_sync.sql` (active migrations) | `workspace_id`, `user_id`, `entry_date`, `minutes`, `start_time`, `end_time`, `topic`, `note`, `mood`, `created_at`, `updated_at` |
| `timesheet_sessions` | `0013_timesheet_sessions.sql`, `0014_timesheet_sessions_multi.sql`, renamed/reshaped by `0021_timesheet_pause_resume.sql` | one open/paused timer per `(user_id, workspace_id)`; `running_since` null = paused |
| `timesheet_session_days` | `0021_timesheet_pause_resume.sql` | per-day accumulated seconds while a timer is paused; unique on `(workspace_id, work_date)` |

RPC: `pause_timesheet_timer(p_workspace_id uuid, p_chunks jsonb)` (from `0021`) — pauses the
session and folds elapsed chunks into `timesheet_session_days`.

Realtime: `timesheet_sessions` and `timesheet_session_days` are published to
`supabase_realtime` so timer state syncs live across devices/tabs.

RLS pattern (identical on every table): `auth.uid() = user_id`, with separate
`select_own` / `insert_own` / `update_own` / `delete_own` policies, `authenticated` granted
CRUD and `service_role` granted ALL.

**What changed when this feature was archived:** the active app's migration
`0025_drop_todo_workspace_id.sql` dropped `todos.workspace_id` (the FK added in
`0017_todo_workspace_timer.sql` linking a todo to a Timesheet workspace). The
`timesheet_*` tables themselves were left untouched — only the app-level coupling was
removed. If you rebuild the standalone PWA, `todos.workspace_id` will need to come back as
whatever linking mechanism you choose (FK again, or the URL-based approach in §4 below).

## 3. Sharing Supabase Auth and Profiles with the Streaks app

The future Timesheet PWA should point at the **same Supabase project** as Streaks/Todos
(same `VITE_SUPABASE_URL` / anon key). This gives you, for free:

- **Auth**: every Timesheet table already has `user_id uuid references auth.users`, and RLS
  already scopes all reads/writes to `auth.uid() = user_id`. A user who signs in to the
  Timesheet PWA with the same Supabase Auth session sees their own Timesheet data
  immediately — no migration needed.
- **Profiles**: the `profiles` table (`supabase/migrations/0011_profiles.sql`,
  `0012_profile_avatar.sql` in the active app) is already keyed by `user_id`. Timesheet only
  ever *read* from it (for the PDF export's "Prepared for {first_name}" line via
  `useProfile()` + `guessFirstNameFromUser()`), so the new PWA can reuse it read-only, or
  extend it if it needs Timesheet-specific profile fields — just don't duplicate the table.
- **Cross-app session**: if both apps run on subdomains of the same parent domain, Supabase's
  browser client can share the auth session via cookies; otherwise each app keeps its own
  local session but both resolve to the same `auth.uid()` since they hit the same project.

Practical bootstrap steps for the new PWA:

1. New Vite/React project, copy `.env.example` pattern, point at the same Supabase URL/anon key.
2. Copy `lib/timesheetLogic.ts`, `lib/timesheetPdf.ts`, `lib/types.ts` from this archive folder.
3. Copy `hooks/*` from this archive folder. They import `@/lib/supabaseClient` and
   `@/hooks/useAuth` — recreate thin equivalents (or copy those two files from the active
   `src/lib` / `src/hooks` too, they're small and app-agnostic).
4. Copy `components/timesheet/*` and the two `pages/*`. Re-wire routing (they used
   `react-router-dom` with `/timesheet` and `/timesheet/:id`).
5. Remount `TimesheetTimerProvider` near the app root (it was previously inside
   `AppShell.tsx`), and render `StopTimerModal` + `ReplacePausedTimerModal` once, globally,
   same as the old `AppShell.tsx` did.
6. If you want offline support again, reintroduce an outbox entity for
   `timesheet_entry_create` / `_update` / `_delete` — see §5 for the exact shape that existed.

## 4. Deep-link blueprint: linking a Todo to a Timesheet entry

Todos no longer carry a `workspace_id` FK (dropped in migration `0025`). The two apps are
independent deployments now, so the recommended way to connect them later is a **URL-based
deep link** instead of a foreign key:

```
Streaks app "Log time" button on a Todo
        │
        │  opens (new tab or same-tab navigation)
        ▼
https://timesheet.<yourdomain>/new
    ?todoId=<todo uuid>
    &title=<url-encoded todo title>
    &minutes=<tracked_minutes, optional>
    &date=<YYYY-MM-DD, optional, defaults to today>
    &returnUrl=<url-encoded URL back to the Streaks todo, optional>
```

Timesheet PWA side (`/new` route, to be built):

1. Read `todoId`, `title`, `minutes`, `date`, `returnUrl` from `useSearchParams()`.
2. Pre-fill a new-entry form: workspace picker defaults to "no workspace selected" (user
   picks one), `topic` defaults to `title`, `note` defaults to `` `From todo: ${title}` ``,
   `minutes` pre-filled from the query param if present, `entry_date` from `date` or today.
3. On save, if `returnUrl` was provided, redirect back (optionally with
   `?loggedMinutes=<n>` so Streaks can show a toast/confirmation).

Streaks app side (to be re-added if this flow is wanted):

1. On the Todo detail view or completion flow (see `hooks/useTodoTimePrompt.tsx` history —
   now simplified to `useCompleteTodoWithTime` in the active app, with no Timesheet
   awareness), add a "Log to Timesheet" button that only appears when `tracked_minutes` is
   set.
2. Build the URL as above and `window.open()` it or navigate to it.
3. Optionally listen for the `loggedMinutes` query param on return to show a confirmation.

This mirrors exactly what `components/todos/TodoTimePromptModal.tsx` used to do in-process
(open a modal offering to save a `timesheet_entries` row in the linked workspace right after
completing a todo) — the difference is it becomes a cross-app redirect instead of a shared
React tree, since the two PWAs are no longer bundled together.

No query-string deep linking existed in the old code (the only param usage app-wide was
Supabase auth's `?type=recovery`), so this is a **net-new** design, not a restoration.

## 5. Offline outbox payload shapes (if you want offline support again)

The active app's outbox (`src/lib/offline/`) used to carry these Timesheet entity variants
before they were removed. Reintroduce equivalents in the new PWA's own outbox if desired:

```ts
export type OutboxEntity = /* ... */ | 'timesheet_entry'

export type OutboxPayload =
  | /* ... */
  | { kind: 'timesheet_entry_create'; workspaceId: string; input: TimesheetEntryInput; clientId: string }
  | { kind: 'timesheet_entry_update'; workspaceId: string; id: string; input: Partial<TimesheetEntryInput> }
  | { kind: 'timesheet_entry_delete'; workspaceId: string; id: string }
```

Conflict detection relied on `timesheet_entries.updated_at` (added by the active app's
`0024_updated_at_sync.sql`, which stays in place since Todos/Streaks also use it).

## 6. What stayed in the active app (do not duplicate)

- `todo_timers` / `todo_timer_days` tables and `useTodoTimer` — the *todo-native* play/pause
  timer, unrelated to Timesheet workspace timers. Kept as-is.
- `formatElapsedClock` — duplicated into `src/lib/todoTimerLogic.ts` in the active app (it was
  originally defined in `lib/timesheetLogic.ts`, which is why a copy still lives in this
  archive too, for drop-in completeness).
- `AccentColor`, `Mood`, `cn`, `formatMinutes`, `toDateKey`/`fromDateKey`,
  `ACCENT_COLOR_MAP` — shared primitives, still exported from the active app's
  `src/lib/types.ts`, `src/lib/utils.ts`, `src/lib/accentColors.ts`. Import from there (or copy
  them) rather than redefining.
