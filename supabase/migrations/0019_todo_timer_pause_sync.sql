-- Pause must be visible on every device: replica identity so realtime UPDATE
-- filters on user_id work, plus an atomic pause RPC keyed by todo_id.

alter table public.todo_timers replica identity full;
alter table public.todo_timer_days replica identity full;

create or replace function public.pause_todo_timer(p_todo_id uuid, p_chunks jsonb)
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

  update public.todo_timers
    set running_since = null
    where todo_id = p_todo_id
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

    insert into public.todo_timer_days (user_id, todo_id, work_date, seconds)
    values (auth.uid(), p_todo_id, work_day, secs)
    on conflict on constraint todo_timer_days_todo_date_key
    do update set seconds = public.todo_timer_days.seconds + excluded.seconds;
  end loop;
end;
$$;

grant execute on function public.pause_todo_timer(uuid, jsonb) to authenticated;
grant execute on function public.pause_todo_timer(uuid, jsonb) to service_role;
