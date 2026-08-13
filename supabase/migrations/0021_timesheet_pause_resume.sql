-- Workspace timers: pause/resume with per-day accumulated seconds (same scheme as todos).
-- running_since null = paused; session row stays until Clock out / End & save clears it.

alter table public.timesheet_sessions
  rename column started_at to running_since;

alter table public.timesheet_sessions
  alter column running_since drop not null;

alter table public.timesheet_sessions replica identity full;

create table if not exists public.timesheet_session_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.timesheet_workspaces (id) on delete cascade,
  work_date date not null,
  seconds integer not null check (seconds >= 0),
  constraint timesheet_session_days_workspace_date_key unique (workspace_id, work_date)
);

create index if not exists timesheet_session_days_user_id_idx on public.timesheet_session_days (user_id);
create index if not exists timesheet_session_days_workspace_id_idx on public.timesheet_session_days (workspace_id);

alter table public.timesheet_session_days enable row level security;

drop policy if exists "timesheet_session_days_select_own" on public.timesheet_session_days;
create policy "timesheet_session_days_select_own" on public.timesheet_session_days
  for select using (auth.uid() = user_id);

drop policy if exists "timesheet_session_days_insert_own" on public.timesheet_session_days;
create policy "timesheet_session_days_insert_own" on public.timesheet_session_days
  for insert with check (auth.uid() = user_id);

drop policy if exists "timesheet_session_days_update_own" on public.timesheet_session_days;
create policy "timesheet_session_days_update_own" on public.timesheet_session_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "timesheet_session_days_delete_own" on public.timesheet_session_days;
create policy "timesheet_session_days_delete_own" on public.timesheet_session_days
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.timesheet_session_days to authenticated;
grant all on table public.timesheet_session_days to service_role;

alter table public.timesheet_session_days replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.timesheet_session_days;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

create or replace function public.pause_timesheet_timer(p_workspace_id uuid, p_chunks jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  chunk jsonb;
  work_day date;
  secs integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.timesheet_sessions
    set running_since = null
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and running_since is not null;

  if p_chunks is null then
    return;
  end if;

  for chunk in
    select elem from jsonb_array_elements(p_chunks) as t(elem)
  loop
    work_day := (chunk->>'dateKey')::date;
    secs := (chunk->>'seconds')::integer;
    if work_day is null or secs is null or secs <= 0 then
      continue;
    end if;

    insert into public.timesheet_session_days (user_id, workspace_id, work_date, seconds)
    values (auth.uid(), p_workspace_id, work_day, secs)
    on conflict on constraint timesheet_session_days_workspace_date_key
    do update set seconds = public.timesheet_session_days.seconds + excluded.seconds;
  end loop;
end;
$$;

grant execute on function public.pause_timesheet_timer(uuid, jsonb) to authenticated;
grant execute on function public.pause_timesheet_timer(uuid, jsonb) to service_role;
