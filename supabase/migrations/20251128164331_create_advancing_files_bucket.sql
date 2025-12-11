-- Create the advancing-files storage bucket for document uploads

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advancing-files',
  'advancing-files',
  false,
  52428800, -- 50MB limit
  array['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
)
on conflict (id) do nothing;

-- Storage policies for advancing-files bucket
-- Users can upload files to their org's folder
create policy "Users can upload advancing files to their org"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'advancing-files'
  and (storage.foldername(name))[1]::uuid in (
    select org_id from org_members where user_id = auth.uid()
  )
);

-- Users can view files from their org
create policy "Users can view advancing files from their org"
on storage.objects for select
to authenticated
using (
  bucket_id = 'advancing-files'
  and (storage.foldername(name))[1]::uuid in (
    select org_id from org_members where user_id = auth.uid()
  )
);

-- Users can update files in their org
create policy "Users can update advancing files in their org"
on storage.objects for update
to authenticated
using (
  bucket_id = 'advancing-files'
  and (storage.foldername(name))[1]::uuid in (
    select org_id from org_members where user_id = auth.uid()
  )
);

-- Users can delete files from their org
create policy "Users can delete advancing files from their org"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'advancing-files'
  and (storage.foldername(name))[1]::uuid in (
    select org_id from org_members where user_id = auth.uid()
  )
);
