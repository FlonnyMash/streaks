-- Flexible routine schedules + date-range overrides.
--
-- Replaces the weekday_default/weekend_default booleans on calendar_routines
-- with a plain day-of-week set (`auto_apply_days`), so a pack can auto-apply
-- on any combination of days (Weekdays, Weekends, Every day, or a fully
-- custom subset), not just the two fixed kinds.
--
-- Also promotes single-date overrides to date *ranges* so a pack can be
-- pinned to "just today", "the next N days", "until a chosen date", "this
-- month", or indefinitely (until manually cleared/replaced).

-- ---------------------------------------------------------------------------
-- calendar_routines: day-of-week set instead of two booleans
-- ---------------------------------------------------------------------------
alter table public.calendar_routines
  add column if not exists auto_apply_days smallint[];

-- Backfill from the old flags (0=Sun..6=Sat, matching JS Date#getDay()).
update public.calendar_routines
set auto_apply_days = '{1,2,3,4,5}'
where weekday_default and auto_apply_days is null;

update public.calendar_routines
set auto_apply_days = '{0,6}'
where weekend_default and auto_apply_days is null;

drop index if exists calendar_routines_weekday_default_uidx;
drop index if exists calendar_routines_weekend_default_uidx;

alter table public.calendar_routines
  drop column if exists weekday_default,
  drop column if exists weekend_default;

-- ---------------------------------------------------------------------------
-- calendar_routine_day_overrides -> calendar_routine_overrides: date ranges
-- ---------------------------------------------------------------------------
alter table public.calendar_routine_day_overrides
  rename to calendar_routine_overrides;

alter table public.calendar_routine_overrides
  rename column entry_date to start_date;

alter table public.calendar_routine_overrides
  add column if not exists end_date date null;

-- A single date no longer uniquely identifies a row (ranges can span many
-- dates), so the old 1:1 uniqueness no longer applies. The app enforces
-- "at most one override covers any given date" by deleting overlapping
-- rows before inserting a new one.
alter table public.calendar_routine_overrides
  drop constraint if exists calendar_routine_day_overrides_user_id_entry_date_key;

create index if not exists calendar_routine_overrides_lookup_idx
  on public.calendar_routine_overrides (user_id, start_date, end_date);
