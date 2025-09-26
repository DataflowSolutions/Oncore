-- Critical fixes for Oncore (Oncore) database
-- 1. Fix UUID extension mismatch
-- 2. Add missing RLS policies for advancing_documents
-- 3. Add org member bootstrap for new orgs
-- 4. Tighten RLS permissions with editor role check
-- 5. Data integrity improvements

-- =====================================
-- 1. FIX UUID EXTENSION MISMATCH
-- =====================================
-- Replace uuid-ossp with pgcrypto since we're using gen_random_uuid()
drop extension if exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =====================================
-- 2. MISSING RLS POLICIES FOR ADVANCING_DOCUMENTS
-- =====================================
create policy adv_docs_select on advancing_documents for select
  using (exists (
    select 1 from advancing_sessions s
    where s.id = session_id and (is_org_member(s.org_id) or has_show_access(s.show_id,'view'))
  ));

create policy adv_docs_write on advancing_documents for insert with check (
  exists (
    select 1 from advancing_sessions s
    where s.id = session_id and (is_org_member(s.org_id) or has_show_access(s.show_id,'edit'))
  )
);

create policy adv_docs_update on advancing_documents for update using (
  exists (
    select 1 from advancing_sessions s
    where s.id = session_id and (is_org_member(s.org_id) or has_show_access(s.show_id,'edit'))
  )
);

create policy adv_docs_delete on advancing_documents for delete using (
  exists (
    select 1 from advancing_sessions s
    where s.id = session_id and is_org_member(s.org_id)
  )
);

-- =====================================
-- 3. FIRST-OWNER BOOTSTRAP FOR NEW ORGS
-- =====================================
-- Create RPC function to create org and assign creator as owner
create or replace function app_create_organization_with_owner(
  org_name text,
  org_slug text
) returns uuid
language plpgsql
security definer
as $$
declare
  new_org_id uuid;
  current_user_id uuid;
begin
  -- Get current user
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  -- Insert organization
  insert into organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  -- Add creator as owner
  insert into org_members (org_id, user_id, role)
  values (new_org_id, current_user_id, 'owner');

  return new_org_id;
end;
$$;

-- Remove direct insert policy on organizations since we use RPC
drop policy if exists org_insert on organizations;

-- =====================================
-- 4. TIGHTEN RLS PERMISSIONS WITH EDITOR ROLE CHECK
-- =====================================
-- Create helper function for editor-level access
create or replace function is_org_editor(p_org uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from org_members
    where org_id = p_org
      and user_id = auth.uid()
      and role in ('owner','admin','editor')
  );
$$;

-- Update policies to use editor check for writes
-- Shows
drop policy if exists shows_insert on shows;
drop policy if exists shows_update on shows;
drop policy if exists shows_delete on shows;

create policy shows_insert on shows for insert with check (is_org_editor(org_id));
create policy shows_update on shows for update using (is_org_editor(org_id));
create policy shows_delete on shows for delete using (is_org_editor(org_id));

-- Artists
drop policy if exists artists_insert on artists;
drop policy if exists artists_update on artists;
drop policy if exists artists_delete on artists;

create policy artists_insert on artists for insert with check (is_org_editor(org_id));
create policy artists_update on artists for update using (is_org_editor(org_id));
create policy artists_delete on artists for delete using (is_org_editor(org_id));

-- Venues
drop policy if exists venues_insert on venues;
drop policy if exists venues_update on venues;
drop policy if exists venues_delete on venues;

create policy venues_insert on venues for insert with check (is_org_editor(org_id));
create policy venues_update on venues for update using (is_org_editor(org_id));
create policy venues_delete on venues for delete using (is_org_editor(org_id));

-- People
drop policy if exists people_insert on people;
drop policy if exists people_update on people;
drop policy if exists people_delete on people;

create policy people_insert on people for insert with check (is_org_editor(org_id));
create policy people_update on people for update using (is_org_editor(org_id));
create policy people_delete on people for delete using (is_org_editor(org_id));

-- Schedule Items
drop policy if exists schedule_items_insert on schedule_items;
drop policy if exists schedule_items_update on schedule_items;
drop policy if exists schedule_items_delete on schedule_items;

create policy schedule_items_insert on schedule_items for insert with check (is_org_editor(org_id));
create policy schedule_items_update on schedule_items for update using (is_org_editor(org_id));
create policy schedule_items_delete on schedule_items for delete using (is_org_editor(org_id));

-- Advancing Sessions
drop policy if exists adv_sessions_insert on advancing_sessions;
drop policy if exists adv_sessions_update on advancing_sessions;
drop policy if exists adv_sessions_delete on advancing_sessions;

create policy adv_sessions_insert on advancing_sessions for insert with check (is_org_editor(org_id));
create policy adv_sessions_update on advancing_sessions for update using (is_org_editor(org_id));
create policy adv_sessions_delete on advancing_sessions for delete using (is_org_editor(org_id));

-- Files (table)
drop policy if exists files_delete on files;
create policy files_delete on files for delete using (is_org_editor(org_id));

-- =====================================
-- 5. INVITE ACCEPTANCE BY PROMOTER (moved after citext conversion)
-- =====================================

-- =====================================
-- 6. DATA INTEGRITY IMPROVEMENTS
-- =====================================

-- Foreign-key side indexes for better performance
create index if not exists idx_adv_docs_session on advancing_documents(session_id);
create index if not exists idx_adv_comments_field on advancing_comments(field_id);
create index if not exists idx_files_document on files(document_id);
create index if not exists idx_files_field on files(field_id);
create index if not exists idx_schedule_show on schedule_items(show_id);
create index if not exists idx_show_collab_user on show_collaborators(user_id);

-- Artist slug uniqueness per org (not globally)
-- Drop the constraint instead of the index
alter table artists drop constraint if exists artists_slug_key;
create unique index if not exists artists_org_slug_unique on artists(org_id, slug) where slug is not null;

-- Enable citext extension for case-insensitive emails
create extension if not exists citext;

-- Update show_collaborators email to be case-insensitive
alter table show_collaborators
  alter column email type citext;

-- Now create the invite claim policy (after citext conversion)
create policy show_collaborators_claim on show_collaborators for update
  using (
    user_id is null
    and lower(email) = lower(auth.jwt()->>'email')
  )
  with check (
    user_id = auth.uid()
  );

-- Unique constraint for user_id per show (prevent duplicate user assignments)
create unique index if not exists show_collab_user_unique
  on show_collaborators(show_id, user_id) where user_id is not null;

-- Check constraints for data integrity
do $$
begin
  -- Schedule end time must be after start time
  if not exists (select 1 from information_schema.table_constraints 
                 where constraint_name = 'schedule_time_order' and table_name = 'schedule_items') then
    alter table schedule_items
      add constraint schedule_time_order check (ends_at is null or ends_at >= starts_at);
  end if;

  -- Files must reference at least one target
  if not exists (select 1 from information_schema.table_constraints 
                 where constraint_name = 'files_target_presence' and table_name = 'files') then
    alter table files
      add constraint files_target_presence check (
        session_id is not null or document_id is not null or field_id is not null
      );
  end if;
end
$$;

-- Unique storage path to prevent duplicates
create unique index if not exists files_storage_path_unique on files(storage_path);

-- =====================================
-- 7. UPDATED_AT COLUMNS AND TRIGGERS
-- =====================================

-- Add updated_at columns to mutable tables
alter table shows add column if not exists updated_at timestamptz default now();
alter table advancing_sessions add column if not exists updated_at timestamptz default now();
alter table advancing_fields add column if not exists updated_at timestamptz default now();
alter table advancing_comments add column if not exists updated_at timestamptz default now();
alter table advancing_documents add column if not exists updated_at timestamptz default now();
alter table files add column if not exists updated_at timestamptz default now();
alter table people add column if not exists updated_at timestamptz default now();
alter table venues add column if not exists updated_at timestamptz default now();
alter table artists add column if not exists updated_at timestamptz default now();
alter table schedule_items add column if not exists updated_at timestamptz default now();

-- Create updated_at trigger function
create or replace function set_updated_at() 
returns trigger 
language plpgsql as $$
begin 
  new.updated_at = now(); 
  return new; 
end 
$$;

-- Apply triggers to all mutable tables (drop first, then recreate)
do $$ 
begin
  -- Shows
  drop trigger if exists t_upd_shows on shows;
  create trigger t_upd_shows before update on shows
    for each row execute function set_updated_at();
  
  -- Advancing Sessions
  drop trigger if exists t_upd_advancing_sessions on advancing_sessions;
  create trigger t_upd_advancing_sessions before update on advancing_sessions
    for each row execute function set_updated_at();
  
  -- Advancing Fields
  drop trigger if exists t_upd_advancing_fields on advancing_fields;
  create trigger t_upd_advancing_fields before update on advancing_fields
    for each row execute function set_updated_at();
  
  -- Advancing Comments
  drop trigger if exists t_upd_advancing_comments on advancing_comments;
  create trigger t_upd_advancing_comments before update on advancing_comments
    for each row execute function set_updated_at();
  
  -- Advancing Documents
  drop trigger if exists t_upd_advancing_documents on advancing_documents;
  create trigger t_upd_advancing_documents before update on advancing_documents
    for each row execute function set_updated_at();
  
  -- Files
  drop trigger if exists t_upd_files on files;
  create trigger t_upd_files before update on files
    for each row execute function set_updated_at();
  
  -- People
  drop trigger if exists t_upd_people on people;
  create trigger t_upd_people before update on people
    for each row execute function set_updated_at();
  
  -- Venues
  drop trigger if exists t_upd_venues on venues;
  create trigger t_upd_venues before update on venues
    for each row execute function set_updated_at();
  
  -- Artists
  drop trigger if exists t_upd_artists on artists;
  create trigger t_upd_artists before update on artists
    for each row execute function set_updated_at();
  
  -- Schedule Items
  drop trigger if exists t_upd_schedule_items on schedule_items;
  create trigger t_upd_schedule_items before update on schedule_items
    for each row execute function set_updated_at();
end
$$;

-- =====================================
-- 8. EXPANDED ACCESS FOR COLLABORATORS
-- =====================================

-- Allow promoters to see day schedules for their shows
drop policy if exists schedule_items_select on schedule_items;
create policy schedule_items_select on schedule_items for select
  using (
    is_org_member(org_id)
    or exists (
      select 1 from show_collaborators sc
      join shows sh on sh.id = schedule_items.show_id
      where sc.show_id = sh.id and sc.user_id = auth.uid()
    )
  );

-- =====================================
-- 9. STORAGE UPLOAD RPC WRAPPER (REMOVED - consolidated in later migration)
-- =====================================
-- Note: app_upload_file function moved to storage_metadata_enforcement migration
-- to avoid conflicts and provide proper Edge Function integration

-- =====================================
-- 10. INVITE ACCEPTANCE RPC
-- =====================================

-- RPC function to accept show collaboration invite
create or replace function app_accept_show_invite(
  p_show_id uuid,
  p_email text
) returns boolean
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
  current_user_email text;
begin
  -- Get current user
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  -- Get current user email
  current_user_email := auth.jwt()->>'email';
  if current_user_email is null then
    raise exception 'User email not found';
  end if;

  -- Update the collaboration record
  update show_collaborators
  set 
    user_id = current_user_id,
    accepted_at = now()
  where 
    show_id = p_show_id
    and lower(email) = lower(p_email)
    and lower(email) = lower(current_user_email)
    and user_id is null;

  return found;
end;
$$;