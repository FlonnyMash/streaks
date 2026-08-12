-- Profiles: first name + date of birth, with a server-enforced 16+ age gate.
--
-- Identity (email, OAuth) stays in `auth.users`; this table only holds the
-- app-specific fields we ask for on top of that (first name, date of birth,
-- and whether the user still needs to complete onboarding).

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  date_of_birth date,
  onboarding_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_first_name_not_blank
    check (first_name is null or char_length(trim(first_name)) > 0)
);

-- ---------------------------------------------------------------------------
-- Enforce the 16+ age rule and make date_of_birth immutable once set.
-- A trigger (rather than a plain CHECK) lets us give a clear error message
-- and reject *changes* to an already-set date_of_birth, not just bad values.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_profile_rules()
returns trigger
language plpgsql
as $$
declare
  v_age int;
begin
  if new.first_name is not null then
    new.first_name := trim(new.first_name);
  end if;

  if new.date_of_birth is not null then
    v_age := date_part('year', age(current_date, new.date_of_birth))::int;
    if v_age < 16 then
      raise exception 'You must be at least 16 years old to use this app.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.date_of_birth is not null
     and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'Date of birth cannot be changed once set.' using errcode = 'P0001';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_enforce_rules on public.profiles;
create trigger profiles_enforce_rules
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_rules();

-- ---------------------------------------------------------------------------
-- Row Level Security: every user can only ever see/edit their own profile.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user is created.
--
-- Email/password sign-up sends `first_name` + `date_of_birth` (ISO date) in
-- the sign-up `options.data`, so `onboarding_required` is already false and
-- the age gate applies immediately (raising here rolls back the whole
-- sign-up transaction, so an underage sign-up never creates an account).
--
-- OAuth sign-in (Google/GitHub) never provides a date of birth, so we only
-- best-effort prefill a first name from the provider profile and leave
-- `onboarding_required = true` — the app then sends the user to
-- /complete-profile to confirm the name and enter a date of birth.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_first_name text;
  v_dob_text text := v_meta ->> 'date_of_birth';
  v_dob date;
begin
  v_first_name := nullif(trim(coalesce(
    v_meta ->> 'first_name',
    v_meta ->> 'given_name',
    split_part(coalesce(v_meta ->> 'full_name', v_meta ->> 'name'), ' ', 1)
  )), '');

  if v_dob_text is not null and v_dob_text <> '' then
    v_dob := v_dob_text::date;
  end if;

  insert into public.profiles (user_id, first_name, date_of_birth, onboarding_required)
  values (new.id, v_first_name, v_dob, v_dob is null)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Backfill: grandfather every existing account. They keep using the app
-- immediately with no name/DOB and no onboarding gate; they can fill this in
-- later from Settings whenever they want.
-- ---------------------------------------------------------------------------
insert into public.profiles (user_id, first_name, date_of_birth, onboarding_required)
select id, null, null, false
from auth.users
on conflict (user_id) do nothing;
