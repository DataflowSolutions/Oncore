-- Fix storage RLS recursion by using security definer functions

-- Drop the problematic policies
drop policy if exists "Users can upload advancing files to their org" on storage.objects;
drop policy if exists "Users can view advancing files from their org" on storage.objects;
drop policy if exists "Users can update advancing files in their org" on storage.objects;
drop policy if exists "Users can delete advancing files from their org" on storage.objects;

-- Create a helper function to check org membership without RLS recursion
create or replace function storage_has_org_access(folder_path text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where user_id = auth.uid()
    and org_id = (string_to_array(folder_path, '/'))[1]::uuid
  );
$$;

-- Recreate storage policies using the helper function
create policy "Users can upload advancing files to their org"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'advancing-files'
  and storage_has_org_access(name)
);

create policy "Users can view advancing files from their org"
on storage.objects for select
to authenticated
using (
  bucket_id = 'advancing-files'
  and storage_has_org_access(name)
);

create policy "Users can update advancing files in their org"
on storage.objects for update
to authenticated
using (
  bucket_id = 'advancing-files'
  and storage_has_org_access(name)
);

create policy "Users can delete advancing files from their org"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'advancing-files'
  and storage_has_org_access(name)
);
