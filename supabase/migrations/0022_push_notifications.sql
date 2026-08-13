-- Web Push: opt-in prefs, per-device subscriptions, per-item notify flags, delivery dedupe.

-- ---------------------------------------------------------------------------
-- Profiles: global push toggle + IANA timezone for local scheduling
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists push_enabled boolean not null default false;

alter table public.profiles
  add column if not exists timezone text;

-- ---------------------------------------------------------------------------
-- Streaks: optional daily reminder at a local wall-clock time
-- ---------------------------------------------------------------------------
alter table public.streaks
  add column if not exists notify_enabled boolean not null default false;

alter table public.streaks
  add column if not exists notify_time time;

alter table public.streaks
  drop constraint if exists streaks_notify_time_required;

alter table public.streaks
  add constraint streaks_notify_time_required
  check (not notify_enabled or notify_time is not null);

-- ---------------------------------------------------------------------------
-- Todos: optional overdue reminders (require a due date when enabled)
-- ---------------------------------------------------------------------------
alter table public.todos
  add column if not exists notify_enabled boolean not null default false;

alter table public.todos
  drop constraint if exists todos_notify_requires_due_date;

alter table public.todos
  add constraint todos_notify_requires_due_date
  check (not notify_enabled or due_date is not null);

-- ---------------------------------------------------------------------------
-- push_subscriptions: one row per browser/device endpoint
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

-- ---------------------------------------------------------------------------
-- push_delivery_log: dedupe automatic (and optional manual) sends
-- ---------------------------------------------------------------------------
create table if not exists public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in ('streak_reminder', 'todo_overdue', 'timer_nudge', 'manual')),
  entity_id uuid,
  bucket text not null,
  created_at timestamptz not null default now(),
  constraint push_delivery_log_dedupe unique (user_id, kind, entity_id, bucket)
);

create index if not exists push_delivery_log_user_id_idx
  on public.push_delivery_log (user_id);

create index if not exists push_delivery_log_created_at_idx
  on public.push_delivery_log (created_at);

alter table public.push_delivery_log enable row level security;

-- Users can read their own log (debug / future UI). Only service_role writes.
drop policy if exists "push_delivery_log_select_own" on public.push_delivery_log;
create policy "push_delivery_log_select_own" on public.push_delivery_log
  for select using (auth.uid() = user_id);

grant select on table public.push_delivery_log to authenticated;
grant all on table public.push_delivery_log to service_role;
