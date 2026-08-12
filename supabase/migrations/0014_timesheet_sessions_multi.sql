-- Allow multiple running timers (max one per workspace per user).

alter table public.timesheet_sessions
  drop constraint if exists timesheet_sessions_one_per_user;

alter table public.timesheet_sessions
  drop constraint if exists timesheet_sessions_one_per_workspace;

alter table public.timesheet_sessions
  add constraint timesheet_sessions_one_per_workspace unique (user_id, workspace_id);

-- Shared clock for cross-device elapsed display (avoids relying on skewed device clocks).
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

grant execute on function public.server_now() to authenticated;
grant execute on function public.server_now() to service_role;
