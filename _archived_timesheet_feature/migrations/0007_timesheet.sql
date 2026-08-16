-- Timesheet: separate project/workspace time logging, each with its own calendar of
-- freeform time blocks (multiple per day allowed), plus a cross-workspace summary view
-- built client-side from the same data.

create table if not exists public.timesheet_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  emoji text not null default '🗂️',
  color text not null default 'blue'
    check (color in ('blue', 'green', 'indigo', 'orange', 'pink', 'red', 'teal', 'yellow')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists timesheet_workspaces_user_id_idx on public.timesheet_workspaces (user_id);

create table if not exists public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.timesheet_workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  minutes int not null check (minutes > 0),
  topic text check (topic is null or char_length(topic) <= 80),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists timesheet_entries_workspace_id_idx on public.timesheet_entries (workspace_id);
create index if not exists timesheet_entries_user_id_idx on public.timesheet_entries (user_id);
create index if not exists timesheet_entries_entry_date_idx on public.timesheet_entries (entry_date);

-- ---------------------------------------------------------------------------
-- Row Level Security: every user can only ever see/modify their own rows
-- ---------------------------------------------------------------------------
alter table public.timesheet_workspaces enable row level security;
alter table public.timesheet_entries enable row level security;

drop policy if exists "timesheet_workspaces_select_own" on public.timesheet_workspaces;
create policy "timesheet_workspaces_select_own" on public.timesheet_workspaces
  for select using (auth.uid() = user_id);

drop policy if exists "timesheet_workspaces_insert_own" on public.timesheet_workspaces;
create policy "timesheet_workspaces_insert_own" on public.timesheet_workspaces
  for insert with check (auth.uid() = user_id);

drop policy if exists "timesheet_workspaces_update_own" on public.timesheet_workspaces;
create policy "timesheet_workspaces_update_own" on public.timesheet_workspaces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "timesheet_workspaces_delete_own" on public.timesheet_workspaces;
create policy "timesheet_workspaces_delete_own" on public.timesheet_workspaces
  for delete using (auth.uid() = user_id);

drop policy if exists "timesheet_entries_select_own" on public.timesheet_entries;
create policy "timesheet_entries_select_own" on public.timesheet_entries
  for select using (auth.uid() = user_id);

drop policy if exists "timesheet_entries_insert_own" on public.timesheet_entries;
create policy "timesheet_entries_insert_own" on public.timesheet_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "timesheet_entries_update_own" on public.timesheet_entries;
create policy "timesheet_entries_update_own" on public.timesheet_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "timesheet_entries_delete_own" on public.timesheet_entries;
create policy "timesheet_entries_delete_own" on public.timesheet_entries
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.timesheet_workspaces to authenticated;
grant select, insert, update, delete on table public.timesheet_entries to authenticated;
grant all on table public.timesheet_workspaces to service_role;
grant all on table public.timesheet_entries to service_role;
