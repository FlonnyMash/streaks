-- Adds optional time tracking to streaks: a streak can opt in to logging minutes
-- each day, and optionally set a daily/weekly/monthly time goal. When a goal is
-- set, meeting it is what drives streak completion instead of the manual
-- checkbox (see src/lib/streakLogic.ts). When track_time is on but no goal is
-- set, minutes are purely informational and logged alongside the checkbox.

alter table public.streaks
  add column if not exists track_time boolean not null default false,
  add column if not exists time_goal_minutes int check (time_goal_minutes is null or time_goal_minutes > 0),
  add column if not exists time_goal_period text check (time_goal_period in ('day', 'week', 'month'));

alter table public.streaks
  drop constraint if exists streaks_time_goal_consistency;

alter table public.streaks
  add constraint streaks_time_goal_consistency check (
    (time_goal_minutes is null and time_goal_period is null) or
    (time_goal_minutes is not null and time_goal_period is not null)
  );

alter table public.streak_entries
  add column if not exists minutes int check (minutes is null or minutes >= 0);
