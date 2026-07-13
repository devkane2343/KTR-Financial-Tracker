-- ============================================================================
-- Storage bucket for custom savings card background images
-- ============================================================================
-- Mirrors storage_setup.sql (the `avatars` bucket): public bucket, 5MB limit,
-- image MIME allowlist, per-user folder RLS keyed on auth.uid(). Objects live
-- at `{user_id}/{account_id}.{ext}`; the account row stores that path and the
-- app resolves a public URL via getPublicUrl.
--
-- Safe to re-run (bucket upsert is a no-op on conflict; policies are dropped
-- first). storage.buckets / storage.objects exist on every Supabase project,
-- so this does not depend on a paid Storage add-on. If the SQL Editor role
-- lacks permission to write storage policies (rare, plan/role-dependent),
-- create the bucket from Dashboard → Storage and run only the policy block.
--
-- The app degrades gracefully without this bucket: cards still save and show,
-- just with no background image, and image upload surfaces a non-fatal warning.
--
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-backgrounds',
  'card-backgrounds',
  true,
  5242880, -- 5MB in bytes
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Allow users to upload background images into their own folder
drop policy if exists "Users can upload their own card background" on storage.objects;
create policy "Users can upload their own card background"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'card-backgrounds' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to replace their own background images
drop policy if exists "Users can update their own card background" on storage.objects;
create policy "Users can update their own card background"
on storage.objects for update
to authenticated
using (
  bucket_id = 'card-backgrounds' and
  auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'card-backgrounds' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own background images
drop policy if exists "Users can delete their own card background" on storage.objects;
create policy "Users can delete their own card background"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'card-backgrounds' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view card backgrounds (public bucket, matches avatars)
drop policy if exists "Anyone can view card backgrounds" on storage.objects;
create policy "Anyone can view card backgrounds"
on storage.objects for select
to public
using (bucket_id = 'card-backgrounds');
