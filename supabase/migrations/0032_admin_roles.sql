-- Admin roles + RLS for the standalone admin panel (see /admin-app and
-- ADMIN_SETUP.md at the repo root).
--
-- `admin_users` is deliberately a standalone table rather than a
-- `profiles.is_admin` column: `profiles` already grants UPDATE to
-- `authenticated` for the row's own owner, so a boolean column there would
-- be self-promotable. This table has no INSERT/UPDATE/DELETE grants at all —
-- promoting a user to admin is only possible via the Supabase SQL editor or
-- a service_role connection.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

alter table public.admin_users enable row level security;

-- SECURITY DEFINER is required here: this function is called from RLS
-- policies on admin_users itself (and every other admin-visible table
-- below), so a SECURITY INVOKER version would recurse into the very RLS
-- check it is trying to answer. `set search_path = public` pins schema
-- resolution so it can't be hijacked by a caller-controlled search_path.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = uid
  );
$$;

comment on function public.is_admin(uuid) is
  'Server-verified admin check. SECURITY DEFINER so it can be used inside RLS policies without recursing. Re-check this on every admin-only query/RPC — never gate access on a client-side check alone.';

grant execute on function public.is_admin(uuid) to authenticated;

drop policy if exists "admin_users_select_self_or_admin" on public.admin_users;
create policy "admin_users_select_self_or_admin" on public.admin_users
  for select using (auth.uid() = user_id or public.is_admin());

grant select on table public.admin_users to authenticated;
grant all on table public.admin_users to service_role;

-- Additive admin read access ----------------------------------------------
-- Postgres OR's together all permissive policies on a table, so adding a
-- second `for select using (public.is_admin())` policy strictly *widens*
-- access for admins without touching the existing `auth.uid() = user_id`
-- policies every other user already relies on for their own rows.
do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'streaks',
    'streak_entries',
    'todos',
    'todo_topics',
    'todo_topic_links',
    'todo_timers',
    'todo_timer_days',
    'calendar_routines',
    'calendar_routine_items',
    'calendar_routine_overrides',
    'calendar_routine_logs',
    'push_subscriptions',
    'push_delivery_log'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
      execute format(
        'create policy %I on public.%I for select using (public.is_admin())',
        t || '_admin_read', t
      );
    end if;
  end loop;
end $$;

-- Analytics RPC -------------------------------------------------------------
-- Runs as the function owner (the migration role, which Supabase grants
-- read access to the `auth` schema), so it can safely read `auth.users`
-- for signup counts that PostgREST can never expose directly to clients.
-- References public.support_tickets, created in migration 0033 — apply
-- both migrations together.
create or replace function public.admin_analytics_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'new_users_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'new_users_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'active_streaks', (select count(*) from public.streaks where archived = false),
    'open_todos', (select count(*) from public.todos where done = false and archived = false),
    'push_enabled_users', (select count(*) from public.profiles where push_enabled = true),
    'open_tickets', (
      case when to_regclass('public.support_tickets') is not null
        then (select count(*) from public.support_tickets where status in ('open', 'pending'))
        else 0
      end
    ),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', signup_count) order by day), '[]'::jsonb)
      from (
        select
          to_char(d::date, 'YYYY-MM-DD') as day,
          count(u.id) as signup_count
        from generate_series((current_date - interval '13 days')::date, current_date::date, interval '1 day') as d
        left join auth.users u on u.created_at::date = d::date
        group by d
        order by d
      ) daily
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_analytics_overview() to authenticated;

-- User list RPC --------------------------------------------------------------
-- `auth.users` (email, last_sign_in_at) is not exposed via PostgREST, so
-- listing/searching users has to go through a SECURITY DEFINER RPC rather
-- than a `select` on a view.
create or replace function public.admin_list_users(
  search text default null,
  page int default 0,
  page_size int default 20
)
returns table (
  user_id uuid,
  email text,
  first_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  onboarding_required boolean,
  push_enabled boolean,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  return query
  with matched as (
    select
      u.id as user_id,
      u.email::text as email,
      p.first_name,
      u.created_at,
      u.last_sign_in_at,
      coalesce(p.onboarding_required, true) as onboarding_required,
      coalesce(p.push_enabled, false) as push_enabled
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where
      search is null or trim(search) = '' or
      u.email ilike '%' || search || '%' or
      p.first_name ilike '%' || search || '%'
  )
  select
    m.user_id,
    m.email,
    m.first_name,
    m.created_at,
    m.last_sign_in_at,
    m.onboarding_required,
    m.push_enabled,
    (select count(*) from matched) as total_count
  from matched m
  order by m.created_at desc
  limit greatest(page_size, 1)
  offset greatest(page, 0) * greatest(page_size, 1);
end;
$$;

grant execute on function public.admin_list_users(text, int, int) to authenticated;
