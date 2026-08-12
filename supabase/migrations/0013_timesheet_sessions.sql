-- Running timesheet clock-in sessions (one open session per user).
-- Finished time is still stored as timesheet_entries; this table only holds
-- the in-progress start so any device can reconstruct elapsed time.

create table if not exists public.timesheet_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.timesheet_workspaces (id) on delete cascade,
  started_at timestamptz not null default now(),
  topic text check (topic is null or char_length(topic) <= 80),
  created_at timestamptz not null default now(),
  -- One active timer per user (expand later by dropping this uniqueness).
  constraint timesheet_sessions_one_per_user unique (user_id)
);

create index if not exists timesheet_sessions_workspace_id_idx
  on public.timesheet_sessions (workspace_id);

alter table public.timesheet_sessions enable row level security;

drop policy if exists "timesheet_sessions_select_own" on public.timesheet_sessions;
create policy "timesheet_sessions_select_own" on public.timesheet_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "timesheet_sessions_insert_own" on public.timesheet_sessions;
create policy "timesheet_sessions_insert_own" on public.timesheet_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "timesheet_sessions_update_own" on public.timesheet_sessions;
create policy "timesheet_sessions_update_own" on public.timesheet_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "timesheet_sessions_delete_own" on public.timesheet_sessions;
create policy "timesheet_sessions_delete_own" on public.timesheet_sessions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.timesheet_sessions to authenticated;
grant all on table public.timesheet_sessions to service_role;

-- Live updates across devices/tabs when a session starts or stops.
do $$
begin
  alter publication supabase_realtime add table public.timesheet_sessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
