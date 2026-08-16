-- Optional clock range for a time block. When both are set, the UI derives `minutes`
-- from the difference (including overnight ranges where end <= start).

alter table public.timesheet_entries
  add column if not exists start_time time,
  add column if not exists end_time time;
