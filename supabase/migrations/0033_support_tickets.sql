-- Support tickets, surfaced in the admin panel's Support Tickets view.
-- Users can open and read their own tickets; only admins can see everyone's
-- and update status/admin_note (see migration 0032 for `public.is_admin()`).

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(trim(subject)) > 0),
  message text not null check (char_length(trim(message)) > 0),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

create or replace function public.touch_support_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists support_tickets_touch_updated_at on public.support_tickets;
create trigger support_tickets_touch_updated_at
  before update on public.support_tickets
  for each row execute function public.touch_support_ticket_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own" on public.support_tickets
  for select using (auth.uid() = user_id);

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own" on public.support_tickets
  for insert with check (auth.uid() = user_id);

-- Users can only ever create/read their own tickets — status, priority, and
-- admin_note are admin-managed fields, so there is intentionally no
-- "update own" policy for regular users.
drop policy if exists "support_tickets_admin_read" on public.support_tickets;
create policy "support_tickets_admin_read" on public.support_tickets
  for select using (public.is_admin());

drop policy if exists "support_tickets_admin_write" on public.support_tickets;
create policy "support_tickets_admin_write" on public.support_tickets
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert on table public.support_tickets to authenticated;
grant all on table public.support_tickets to service_role;
