-- Grant CRUD to authenticated users. RLS still restricts rows to auth.uid().
-- Without these grants, inserts fail with a permission error that the UI
-- previously collapsed to the generic "Could not save streak." message.

grant select, insert, update, delete on table public.streaks to authenticated;
grant select, insert, update, delete on table public.streak_entries to authenticated;

-- Keep service_role fully privileged for admin/server use.
grant all on table public.streaks to service_role;
grant all on table public.streak_entries to service_role;
