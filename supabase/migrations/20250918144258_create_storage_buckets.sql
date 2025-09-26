-- Storage buckets and policies for Oncore (Oncore)
-- Creates buckets for documents, advancing files, and images

-- =====================================
-- CREATE STORAGE BUCKETS
-- =====================================

-- Bucket for general documents (contracts, riders, etc.)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- Bucket for advancing session files
insert into storage.buckets (id, name, public)
values ('advancing-files', 'advancing-files', false);

-- Bucket for images (logos, photos, etc.)
insert into storage.buckets (id, name, public)
values ('images', 'images', false);

-- =====================================
-- STORAGE POLICIES
-- =====================================

-- Documents bucket policies
create policy doc_read on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and (exists(select 1 from org_members where org_id=sh.org_id and user_id=auth.uid())
                        or exists(select 1 from show_collaborators where show_id=sh.id and user_id=auth.uid())))
    )
  );

create policy doc_write on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators 
                             where show_id=sh.id and user_id=auth.uid() and role='promoter_editor'))
    )
  );

create policy doc_update on storage.objects for update
  using (
    bucket_id = 'documents'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators 
                             where show_id=sh.id and user_id=auth.uid() and role='promoter_editor'))
    )
  );

create policy doc_delete on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
  );

-- Advancing files bucket policies
create policy adv_files_read on storage.objects for select
  using (
    bucket_id = 'advancing-files'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators where show_id=sh.id and user_id=auth.uid()))
    )
  );

create policy adv_files_write on storage.objects for insert
  with check (
    bucket_id = 'advancing-files'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators 
                             where show_id=sh.id and user_id=auth.uid() and role='promoter_editor'))
    )
  );

create policy adv_files_update on storage.objects for update
  using (
    bucket_id = 'advancing-files'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators 
                             where show_id=sh.id and user_id=auth.uid() and role='promoter_editor'))
    )
  );

create policy adv_files_delete on storage.objects for delete
  using (
    bucket_id = 'advancing-files'
    and (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
  );

-- Images bucket policies
create policy images_read on storage.objects for select
  using (
    bucket_id = 'images'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators where show_id=sh.id and user_id=auth.uid()))
    )
  );

create policy images_write on storage.objects for insert
  with check (
    bucket_id = 'images'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators 
                             where show_id=sh.id and user_id=auth.uid() and role='promoter_editor'))
    )
  );

create policy images_update on storage.objects for update
  using (
    bucket_id = 'images'
    and (
      (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
      or exists (select 1 from shows sh
                 where sh.id=(metadata->>'show_id')::uuid
                   and exists(select 1 from show_collaborators 
                             where show_id=sh.id and user_id=auth.uid() and role='promoter_editor'))
    )
  );

create policy images_delete on storage.objects for delete
  using (
    bucket_id = 'images'
    and (metadata->>'org_id')::uuid in (select org_id from org_members where user_id=auth.uid())
  );