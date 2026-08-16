-- Per-workspace quick-select durations for the day time logger (minutes).

alter table public.timesheet_workspaces
  add column if not exists quick_presets integer[] not null default '{15,30,60,120,240,480}';
