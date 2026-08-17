-- Adds Tiimo-style time-block scheduling to todos: which part of the day a
-- task belongs to, and how long it's expected to take. Both are optional
-- from the DB's point of view (routine defaults to 'anytime'), so existing
-- rows and the offline outbox keep working unchanged.

alter table public.todos
  add column if not exists routine text not null default 'anytime';

alter table public.todos
  drop constraint if exists todos_routine_check;

alter table public.todos
  add constraint todos_routine_check
  check (routine in ('morning', 'afternoon', 'evening', 'anytime'));

alter table public.todos
  add column if not exists estimated_minutes integer null;

alter table public.todos
  drop constraint if exists todos_estimated_minutes_check;

alter table public.todos
  add constraint todos_estimated_minutes_check
  check (estimated_minutes is null or estimated_minutes > 0);

create index if not exists todos_routine_idx on public.todos (user_id, routine);
