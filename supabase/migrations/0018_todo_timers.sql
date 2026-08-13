-- Standalone todo pause/resume timers. Time is flushed into per-day seconds on pause.
-- Timesheet entries are created later from the Done summary, if the user agrees.

alter table public.timesheet_sessions drop column if exists todo_id;

create table if not exists public.todo_timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid not null references public.todos (id) on delete cascade,
  running_since timestamptz,
  created_at timestamptz not null default now(),
  constraint todo_timers_todo_id_key unique (todo_id)
);

create unique index if not exists todo_timers_one_running_per_user
  on public.todo_timers (user_id)
  where running_since is not null;

create index if not exists todo_timers_user_id_idx on public.todo_timers (user_id);

create table if not exists public.todo_timer_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id uuid not null references public.todos (id) on delete cascade,
  work_date date not null,
  seconds integer not null check (seconds >= 0),
  constraint todo_timer_days_todo_date_key unique (todo_id, work_date)
);

create index if not exists todo_timer_days_user_id_idx on public.todo_timer_days (user_id);
create index if not exists todo_timer_days_todo_id_idx on public.todo_timer_days (todo_id);

alter table public.todo_timers enable row level security;
alter table public.todo_timer_days enable row level security;

drop policy if exists "todo_timers_select_own" on public.todo_timers;
create policy "todo_timers_select_own" on public.todo_timers
  for select using (auth.uid() = user_id);

drop policy if exists "todo_timers_insert_own" on public.todo_timers;
create policy "todo_timers_insert_own" on public.todo_timers
  for insert with check (auth.uid() = user_id);

drop policy if exists "todo_timers_update_own" on public.todo_timers;
create policy "todo_timers_update_own" on public.todo_timers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todo_timers_delete_own" on public.todo_timers;
create policy "todo_timers_delete_own" on public.todo_timers
  for delete using (auth.uid() = user_id);

drop policy if exists "todo_timer_days_select_own" on public.todo_timer_days;
create policy "todo_timer_days_select_own" on public.todo_timer_days
  for select using (auth.uid() = user_id);

drop policy if exists "todo_timer_days_insert_own" on public.todo_timer_days;
create policy "todo_timer_days_insert_own" on public.todo_timer_days
  for insert with check (auth.uid() = user_id);

drop policy if exists "todo_timer_days_update_own" on public.todo_timer_days;
create policy "todo_timer_days_update_own" on public.todo_timer_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todo_timer_days_delete_own" on public.todo_timer_days;
create policy "todo_timer_days_delete_own" on public.todo_timer_days
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.todo_timers to authenticated;
grant all on table public.todo_timers to service_role;
grant select, insert, update, delete on table public.todo_timer_days to authenticated;
grant all on table public.todo_timer_days to service_role;

do $$
begin
  alter publication supabase_realtime add table public.todo_timers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.todo_timer_days;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
