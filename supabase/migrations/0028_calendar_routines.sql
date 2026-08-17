-- Calendar daily routines: Morning / Afternoon / Evening containers that repeat every
-- day on the Calendar page. Distinct from `streaks` (optional, not calendar-bound) and
-- `todos` (one-off, only calendar-linked via an explicit due_date). One template row per
-- activity; per-day completion is tracked separately so checking off Monday doesn't
-- affect Tuesday.

-- ---------------------------------------------------------------------------
-- calendar_routine_items: repeating routine templates, shown on every day
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  emoji text not null default '⭐',
  block text not null check (block in ('morning', 'afternoon', 'evening')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  position double precision not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_routine_items_user_id_idx on public.calendar_routine_items (user_id);

-- ---------------------------------------------------------------------------
-- calendar_routine_logs: one row per (item, day) that's been checked off
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_routine_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.calendar_routine_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, entry_date)
);

create index if not exists calendar_routine_logs_item_id_idx on public.calendar_routine_logs (item_id);
create index if not exists calendar_routine_logs_user_id_idx on public.calendar_routine_logs (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_updated_at() from 0024_updated_at_sync.sql)
-- ---------------------------------------------------------------------------
drop trigger if exists calendar_routine_items_set_updated_at on public.calendar_routine_items;
create trigger calendar_routine_items_set_updated_at
  before update on public.calendar_routine_items
  for each row execute function public.set_updated_at();

drop trigger if exists calendar_routine_logs_set_updated_at on public.calendar_routine_logs;
create trigger calendar_routine_logs_set_updated_at
  before update on public.calendar_routine_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: every user can only ever see/modify their own rows
-- ---------------------------------------------------------------------------
alter table public.calendar_routine_items enable row level security;
alter table public.calendar_routine_logs enable row level security;

drop policy if exists "calendar_routine_items_select_own" on public.calendar_routine_items;
create policy "calendar_routine_items_select_own" on public.calendar_routine_items
  for select using (auth.uid() = user_id);

drop policy if exists "calendar_routine_items_insert_own" on public.calendar_routine_items;
create policy "calendar_routine_items_insert_own" on public.calendar_routine_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_routine_items_update_own" on public.calendar_routine_items;
create policy "calendar_routine_items_update_own" on public.calendar_routine_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar_routine_items_delete_own" on public.calendar_routine_items;
create policy "calendar_routine_items_delete_own" on public.calendar_routine_items
  for delete using (auth.uid() = user_id);

drop policy if exists "calendar_routine_logs_select_own" on public.calendar_routine_logs;
create policy "calendar_routine_logs_select_own" on public.calendar_routine_logs
  for select using (auth.uid() = user_id);

drop policy if exists "calendar_routine_logs_insert_own" on public.calendar_routine_logs;
create policy "calendar_routine_logs_insert_own" on public.calendar_routine_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_routine_logs_update_own" on public.calendar_routine_logs;
create policy "calendar_routine_logs_update_own" on public.calendar_routine_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar_routine_logs_delete_own" on public.calendar_routine_logs;
create policy "calendar_routine_logs_delete_own" on public.calendar_routine_logs
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.calendar_routine_items to authenticated;
grant select, insert, update, delete on table public.calendar_routine_logs to authenticated;
grant all on table public.calendar_routine_items to service_role;
grant all on table public.calendar_routine_logs to service_role;
