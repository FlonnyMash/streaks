-- Optional workspace on todos so Play can log time to a timesheet.
-- Optional todo_id on running sessions so completing a task only claims its own timer.

alter table public.todos
  add column if not exists workspace_id uuid references public.timesheet_workspaces (id) on delete set null;

create index if not exists todos_workspace_id_idx on public.todos (workspace_id);

alter table public.timesheet_sessions
  add column if not exists todo_id uuid references public.todos (id) on delete set null;

create index if not exists timesheet_sessions_todo_id_idx on public.timesheet_sessions (todo_id);
