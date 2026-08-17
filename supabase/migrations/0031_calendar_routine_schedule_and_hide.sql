-- 1. Allow a date-range override with no pack, meaning "explicitly no routine
--    today" (hides auto-apply without deleting the weekday schedule).
-- 2. Atomic RPC for exclusive day-of-week assignment so stripping overlapping
--    days from other packs and updating the target pack cannot partial-commit.

alter table public.calendar_routine_overrides
  alter column routine_id drop not null;

create or replace function public.set_calendar_routine_schedule(
  p_routine_id uuid,
  p_days smallint[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_days smallint[];
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_days is not null and exists (
    select 1 from unnest(p_days) as d where d < 0 or d > 6
  ) then
    raise exception 'Invalid weekday';
  end if;

  if not exists (
    select 1
    from public.calendar_routines
    where id = p_routine_id
      and user_id = uid
      and not archived
  ) then
    raise exception 'Routine not found';
  end if;

  if p_days is null or cardinality(p_days) = 0 then
    next_days := null;
  else
    next_days := p_days;
  end if;

  if next_days is not null then
    update public.calendar_routines cr
    set auto_apply_days = sub.remaining
    from (
      select
        id,
        case
          when cardinality(kept.days) = 0 then null
          else kept.days
        end as remaining
      from public.calendar_routines,
      lateral (
        select coalesce(array_agg(d order by d), '{}'::smallint[]) as days
        from unnest(coalesce(auto_apply_days, '{}'::smallint[])) as d
        where not (d = any (next_days))
      ) kept
    ) sub
    where cr.id = sub.id
      and cr.user_id = uid
      and cr.id <> p_routine_id
      and not cr.archived
      and cr.auto_apply_days is not null
      and cr.auto_apply_days && next_days;
  end if;

  update public.calendar_routines
  set auto_apply_days = next_days
  where id = p_routine_id
    and user_id = uid;
end;
$$;

grant execute on function public.set_calendar_routine_schedule(uuid, smallint[]) to authenticated;
grant execute on function public.set_calendar_routine_schedule(uuid, smallint[]) to service_role;
