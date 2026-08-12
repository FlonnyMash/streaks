-- Todos: a lightweight checklist section, separate from streaks. One row per task.

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  notes text check (notes is null or char_length(notes) <= 1000),
  done boolean not null default false,
  due_date date,
  position double precision not null default 0,
  archived boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists todos_user_id_idx on public.todos (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: every user can only ever see/modify their own todos
-- ---------------------------------------------------------------------------
alter table public.todos enable row level security;

drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
  for select using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.todos to authenticated;
grant all on table public.todos to service_role;
