-- Profile avatars: a persisted `avatar_url` on `profiles` plus a public
-- Supabase Storage bucket users can upload/replace their own photo into.
--
-- The OAuth provider's picture (Google/GitHub `user_metadata.avatar_url` /
-- `picture`) is used client-side as the default when `avatar_url` is null —
-- we don't copy it into storage automatically, only once the user uploads
-- their own image do we persist anything here.

alter table public.profiles add column if not exists avatar_url text;

-- ---------------------------------------------------------------------------
-- Storage bucket: public read (so `<img>` tags can load avatars directly via
-- their public URL) but writes are restricted to the owning user below.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Objects are stored as `{user_id}/...`, so `storage.foldername(name)[1]`
-- (the first path segment) must match the caller's uid for writes.
drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
