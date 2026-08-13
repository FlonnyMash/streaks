-- Add updated_at for offline outbox conflict detection on domain tables.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.streaks
  add column if not exists updated_at timestamptz;

alter table public.streak_entries
  add column if not exists updated_at timestamptz;

alter table public.todos
  add column if not exists updated_at timestamptz;

alter table public.timesheet_entries
  add column if not exists updated_at timestamptz;

update public.streaks
set updated_at = coalesce(created_at, now())
where updated_at is null;

update public.streak_entries
set updated_at = coalesce(created_at, now())
where updated_at is null;

update public.todos
set updated_at = coalesce(created_at, now())
where updated_at is null;

update public.timesheet_entries
set updated_at = coalesce(created_at, now())
where updated_at is null;

alter table public.streaks
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.streak_entries
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.todos
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.timesheet_entries
  alter column updated_at set default now(),
  alter column updated_at set not null;

drop trigger if exists streaks_set_updated_at on public.streaks;
create trigger streaks_set_updated_at
  before update on public.streaks
  for each row execute function public.set_updated_at();

drop trigger if exists streak_entries_set_updated_at on public.streak_entries;
create trigger streak_entries_set_updated_at
  before update on public.streak_entries
  for each row execute function public.set_updated_at();

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

drop trigger if exists timesheet_entries_set_updated_at on public.timesheet_entries;
create trigger timesheet_entries_set_updated_at
  before update on public.timesheet_entries
  for each row execute function public.set_updated_at();
