-- Todo topics: user-owned tags that can be attached to many todos (and a todo can
-- have many topics). Names are unique per user, case-insensitively.

create table if not exists public.todo_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0 and char_length(name) <= 40),
  created_at timestamptz not null default now()
);

create index if not exists todo_topics_user_id_idx on public.todo_topics (user_id);
create unique index if not exists todo_topics_user_id_lower_name_idx
  on public.todo_topics (user_id, lower(name));

create table if not exists public.todo_topic_links (
  todo_id uuid not null references public.todos (id) on delete cascade,
  topic_id uuid not null references public.todo_topics (id) on delete cascade,
  primary key (todo_id, topic_id)
);

create index if not exists todo_topic_links_topic_id_idx on public.todo_topic_links (topic_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.todo_topics enable row level security;
alter table public.todo_topic_links enable row level security;

drop policy if exists "todo_topics_select_own" on public.todo_topics;
create policy "todo_topics_select_own" on public.todo_topics
  for select using (auth.uid() = user_id);

drop policy if exists "todo_topics_insert_own" on public.todo_topics;
create policy "todo_topics_insert_own" on public.todo_topics
  for insert with check (auth.uid() = user_id);

drop policy if exists "todo_topics_update_own" on public.todo_topics;
create policy "todo_topics_update_own" on public.todo_topics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todo_topics_delete_own" on public.todo_topics;
create policy "todo_topics_delete_own" on public.todo_topics
  for delete using (auth.uid() = user_id);

drop policy if exists "todo_topic_links_select_own" on public.todo_topic_links;
create policy "todo_topic_links_select_own" on public.todo_topic_links
  for select using (
    exists (
      select 1 from public.todos
      where todos.id = todo_topic_links.todo_id
        and todos.user_id = auth.uid()
    )
  );

drop policy if exists "todo_topic_links_insert_own" on public.todo_topic_links;
create policy "todo_topic_links_insert_own" on public.todo_topic_links
  for insert with check (
    exists (
      select 1 from public.todos
      where todos.id = todo_topic_links.todo_id
        and todos.user_id = auth.uid()
    )
    and exists (
      select 1 from public.todo_topics
      where todo_topics.id = todo_topic_links.topic_id
        and todo_topics.user_id = auth.uid()
    )
  );

drop policy if exists "todo_topic_links_update_own" on public.todo_topic_links;
create policy "todo_topic_links_update_own" on public.todo_topic_links
  for update using (
    exists (
      select 1 from public.todos
      where todos.id = todo_topic_links.todo_id
        and todos.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.todos
      where todos.id = todo_topic_links.todo_id
        and todos.user_id = auth.uid()
    )
    and exists (
      select 1 from public.todo_topics
      where todo_topics.id = todo_topic_links.topic_id
        and todo_topics.user_id = auth.uid()
    )
  );

drop policy if exists "todo_topic_links_delete_own" on public.todo_topic_links;
create policy "todo_topic_links_delete_own" on public.todo_topic_links
  for delete using (
    exists (
      select 1 from public.todos
      where todos.id = todo_topic_links.todo_id
        and todos.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.todo_topics to authenticated;
grant select, insert, update, delete on table public.todo_topic_links to authenticated;
grant all on table public.todo_topics to service_role;
grant all on table public.todo_topic_links to service_role;
