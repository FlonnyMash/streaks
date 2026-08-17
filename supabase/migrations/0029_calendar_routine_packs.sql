-- Switchable calendar routine packs: instead of one fixed set of
-- Morning/Afternoon/Evening items shown on every day, users can now create
-- named packs (Weekdays, Weekend, Holiday, ...) and switch which pack
-- applies to a given day. `calendar_routine_items` now belong to a pack via
-- `routine_id`; `calendar_routine_logs` are unchanged (still keyed by item id
-- + date), so switching packs never rewrites past completions.

-- ---------------------------------------------------------------------------
-- calendar_routines: named packs (e.g. "Weekdays", "Weekend", "Holiday")
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  emoji text not null default '📅',
  position double precision not null default 0,
  -- Applied automatically on Mon-Fri / Sat-Sun respectively when no explicit
  -- day override exists. At most one of each per user (see partial unique
  -- indexes below).
  weekday_default boolean not null default false,
  weekend_default boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_routines_user_id_idx on public.calendar_routines (user_id);

drop index if exists calendar_routines_weekday_default_uidx;
create unique index calendar_routines_weekday_default_uidx
  on public.calendar_routines (user_id)
  where weekday_default and not archived;

drop index if exists calendar_routines_weekend_default_uidx;
create unique index calendar_routines_weekend_default_uidx
  on public.calendar_routines (user_id)
  where weekend_default and not archived;

-- ---------------------------------------------------------------------------
-- calendar_routine_items: now scoped to a pack instead of shown every day
-- ---------------------------------------------------------------------------
alter table public.calendar_routine_items
  add column if not exists routine_id uuid references public.calendar_routines (id) on delete cascade;

-- Backfill: give every existing user (profile) a "Weekdays" pack and attach
-- any of their pre-existing items to it, so nothing already created
-- disappears from the calendar.
insert into public.calendar_routines (user_id, name, emoji, weekday_default)
select p.user_id, 'Weekdays', '📅', true
from public.profiles p
where not exists (
  select 1 from public.calendar_routines cr
  where cr.user_id = p.user_id and cr.weekday_default and not cr.archived
);

update public.calendar_routine_items i
set routine_id = cr.id
from public.calendar_routines cr
where i.routine_id is null
  and cr.user_id = i.user_id
  and cr.weekday_default
  and not cr.archived;

alter table public.calendar_routine_items
  alter column routine_id set not null;

create index if not exists calendar_routine_items_routine_id_idx on public.calendar_routine_items (routine_id);

-- ---------------------------------------------------------------------------
-- calendar_routine_day_overrides: pins one specific calendar date to a pack,
-- taking priority over the weekday/weekend default (used for holidays, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_routine_day_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  routine_id uuid not null references public.calendar_routines (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists calendar_routine_day_overrides_user_id_idx on public.calendar_routine_day_overrides (user_id);
create index if not exists calendar_routine_day_overrides_routine_id_idx on public.calendar_routine_day_overrides (routine_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuses public.set_updated_at() from 0024_updated_at_sync.sql)
-- ---------------------------------------------------------------------------
drop trigger if exists calendar_routines_set_updated_at on public.calendar_routines;
create trigger calendar_routines_set_updated_at
  before update on public.calendar_routines
  for each row execute function public.set_updated_at();

drop trigger if exists calendar_routine_day_overrides_set_updated_at on public.calendar_routine_day_overrides;
create trigger calendar_routine_day_overrides_set_updated_at
  before update on public.calendar_routine_day_overrides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: every user can only ever see/modify their own rows
-- ---------------------------------------------------------------------------
alter table public.calendar_routines enable row level security;
alter table public.calendar_routine_day_overrides enable row level security;

drop policy if exists "calendar_routines_select_own" on public.calendar_routines;
create policy "calendar_routines_select_own" on public.calendar_routines
  for select using (auth.uid() = user_id);

drop policy if exists "calendar_routines_insert_own" on public.calendar_routines;
create policy "calendar_routines_insert_own" on public.calendar_routines
  for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_routines_update_own" on public.calendar_routines;
create policy "calendar_routines_update_own" on public.calendar_routines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar_routines_delete_own" on public.calendar_routines;
create policy "calendar_routines_delete_own" on public.calendar_routines
  for delete using (auth.uid() = user_id);

drop policy if exists "calendar_routine_day_overrides_select_own" on public.calendar_routine_day_overrides;
create policy "calendar_routine_day_overrides_select_own" on public.calendar_routine_day_overrides
  for select using (auth.uid() = user_id);

drop policy if exists "calendar_routine_day_overrides_insert_own" on public.calendar_routine_day_overrides;
create policy "calendar_routine_day_overrides_insert_own" on public.calendar_routine_day_overrides
  for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_routine_day_overrides_update_own" on public.calendar_routine_day_overrides;
create policy "calendar_routine_day_overrides_update_own" on public.calendar_routine_day_overrides
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar_routine_day_overrides_delete_own" on public.calendar_routine_day_overrides;
create policy "calendar_routine_day_overrides_delete_own" on public.calendar_routine_day_overrides
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.calendar_routines to authenticated;
grant select, insert, update, delete on table public.calendar_routine_day_overrides to authenticated;
grant all on table public.calendar_routines to service_role;
grant all on table public.calendar_routine_day_overrides to service_role;
