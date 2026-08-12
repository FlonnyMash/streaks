-- Add an importance level (1=low, 2=medium, 3=high) used for sorting and display.

alter table public.todos
  add column if not exists importance smallint not null default 2
  check (importance between 1 and 3);

create index if not exists todos_user_importance_idx on public.todos (user_id, importance desc);
