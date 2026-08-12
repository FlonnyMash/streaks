-- Streaks app schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- streaks: one row per habit/streak type a user has created
-- ---------------------------------------------------------------------------
create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  emoji text not null default '🔥',
  color text not null default 'blue'
    check (color in ('blue', 'green', 'indigo', 'orange', 'pink', 'red', 'teal', 'yellow')),
  frequency_type text not null default 'daily'
    check (frequency_type in ('daily', 'weekdays', 'times_per_week')),
  target_weekdays int[],
  target_count int,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists streaks_user_id_idx on public.streaks (user_id);

-- ---------------------------------------------------------------------------
-- streak_entries: one row per day a streak was marked complete/incomplete
-- ---------------------------------------------------------------------------
create table if not exists public.streak_entries (
  id uuid primary key default gen_random_uuid(),
  streak_id uuid not null references public.streaks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (streak_id, entry_date)
);

create index if not exists streak_entries_streak_id_idx on public.streak_entries (streak_id);
create index if not exists streak_entries_user_id_idx on public.streak_entries (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: every user can only ever see/modify their own rows
-- ---------------------------------------------------------------------------
alter table public.streaks enable row level security;
alter table public.streak_entries enable row level security;

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select using (auth.uid() = user_id);

drop policy if exists "streaks_insert_own" on public.streaks;
create policy "streaks_insert_own" on public.streaks
  for insert with check (auth.uid() = user_id);

drop policy if exists "streaks_update_own" on public.streaks;
create policy "streaks_update_own" on public.streaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "streaks_delete_own" on public.streaks;
create policy "streaks_delete_own" on public.streaks
  for delete using (auth.uid() = user_id);

drop policy if exists "entries_select_own" on public.streak_entries;
create policy "entries_select_own" on public.streak_entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.streak_entries;
create policy "entries_insert_own" on public.streak_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.streak_entries;
create policy "entries_update_own" on public.streak_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.streak_entries;
create policy "entries_delete_own" on public.streak_entries
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Self-service account deletion. Runs as the function owner (bypassing RLS)
-- so a signed-in user can delete their own auth.users row; `streaks` and
-- `streak_entries` cascade-delete automatically via their foreign keys.
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
