-- 1. Create the 'avatars' bucket (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Policy: Allow Authenticated Users to Upload (INSERT)
-- Allows any logged-in user to upload a file to the 'avatars' bucket
create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

-- 3. Policy: Allow Authenticated Users to Update (UPDATE)
-- Allows logged-in users to update files in the 'avatars' bucket
create policy "Authenticated users can update avatars"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' );

-- 4. Policy: Allow Public Read Access (SELECT)
-- Ensures the avatar is visible to everyone (needed for displaying the image)
create policy "Public read access to avatars"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );
