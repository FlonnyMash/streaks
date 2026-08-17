-- Tracks completion of the Tiimo-style guided onboarding tour (routine
-- pickers, sample task trial, milestone screen, notification primer) as a
-- flag distinct from `onboarding_required` (which only covers the
-- name/date-of-birth profile step).

alter table public.profiles
  add column if not exists onboarding_tour_completed boolean not null default false;

-- Grandfather every existing account so nobody who already uses the app gets
-- forced into the new tour retroactively. Only new signups going forward
-- start with `false`.
update public.profiles
set onboarding_tour_completed = true
where onboarding_tour_completed = false;
