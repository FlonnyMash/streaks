-- Enforce that a streak's frequency-specific fields are always consistent with
-- its frequency_type, so `target_count` can never be null for a 'times_per_week'
-- streak (which previously could render as "nullx per week" in the UI), and
-- `target_weekdays` can never be null/empty for a 'weekdays' streak.
--
-- Run this after 0001_init.sql. Safe to re-run.

alter table public.streaks
  drop constraint if exists streaks_frequency_fields_check;

alter table public.streaks
  add constraint streaks_frequency_fields_check check (
    case frequency_type
      when 'times_per_week' then target_count is not null and target_count between 1 and 7
      when 'weekdays' then target_weekdays is not null and cardinality(target_weekdays) > 0
      else true -- 'daily' doesn't require either field
    end
  );
