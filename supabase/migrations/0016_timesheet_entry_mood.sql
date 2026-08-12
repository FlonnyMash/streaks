-- Optional 3-level mood on timesheet entries ("How was your day?" on clock-out).

alter table public.timesheet_entries
  add column if not exists mood smallint check (mood is null or mood between 1 and 3);
