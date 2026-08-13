-- Persist how long a completed todo took (from its pause/resume timer).

alter table public.todos
  add column if not exists tracked_minutes integer
  check (tracked_minutes is null or tracked_minutes >= 1);
