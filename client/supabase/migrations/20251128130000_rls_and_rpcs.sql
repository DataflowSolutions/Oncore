-- RLS + RPCs aligned with frontend expectations (service role unavailable)
set check_function_bodies = off;

-- Helper: check membership
create or replace function is_org_member(p_org uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from org_members om
    where om.org_id = p_org
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

----------------------------------------------------------------------
-- RLS enablement and policies
----------------------------------------------------------------------

alter table organizations enable row level security;
do $$ begin
  drop policy org_select on organizations;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy org_ins on organizations;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy org_upd on organizations;
exception when undefined_object then null; end $$;
create policy org_select on organizations for select using (is_org_member(id));
create policy org_ins on organizations for insert with check ((select auth.uid()) is not null);
create policy org_upd on organizations for update using (is_org_member(id)) with check (is_org_member(id));

-- Org members
alter table org_members enable row level security;
do $$ begin
  drop policy org_members_select on org_members;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy org_members_write on org_members;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy org_members_ins on org_members;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy org_members_upd on org_members;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy org_members_del on org_members;
exception when undefined_object then null; end $$;
create policy org_members_select on org_members for select using (is_org_member(org_id));
create policy org_members_ins on org_members for insert with check (is_org_member(org_id));
create policy org_members_upd on org_members for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy org_members_del on org_members for delete using (is_org_member(org_id));

-- Invitations
alter table invitations enable row level security;
do $$ begin
  drop policy invitations_select on invitations;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy invitations_write on invitations;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy invitations_ins on invitations;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy invitations_upd on invitations;
exception when undefined_object then null; end $$;
do $$ begin
  drop policy invitations_del on invitations;
exception when undefined_object then null; end $$;
create policy invitations_select on invitations for select using (is_org_member(org_id));
create policy invitations_ins on invitations for insert with check (is_org_member(org_id));
create policy invitations_upd on invitations for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy invitations_del on invitations for delete using (is_org_member(org_id));

-- People / venues / contacts / venue_contacts
alter table people enable row level security;
do $$ begin
  drop policy people_rw on people;
exception when undefined_object then null; end $$;
create policy people_rw on people for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table venues enable row level security;
do $$ begin
  drop policy venues_rw on venues;
exception when undefined_object then null; end $$;
create policy venues_rw on venues for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table contacts enable row level security;
do $$ begin
  drop policy contacts_rw on contacts;
exception when undefined_object then null; end $$;
create policy contacts_rw on contacts for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table venue_contacts enable row level security;
do $$ begin
  drop policy venue_contacts_rw on venue_contacts;
exception when undefined_object then null; end $$;
create policy venue_contacts_rw on venue_contacts for all
  using (exists (select 1 from venues v where v.id = venue_id and is_org_member(v.org_id)))
  with check (exists (select 1 from venues v where v.id = venue_id and is_org_member(v.org_id)));

-- Shows and related
alter table shows enable row level security;
do $$ begin
  drop policy shows_rw on shows;
exception when undefined_object then null; end $$;
create policy shows_rw on shows for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table show_assignments enable row level security;
do $$ begin
  drop policy show_assignments_rw on show_assignments;
exception when undefined_object then null; end $$;
create policy show_assignments_rw on show_assignments for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

alter table show_guestlist enable row level security;
do $$ begin
  drop policy show_guestlist_rw on show_guestlist;
exception when undefined_object then null; end $$;
create policy show_guestlist_rw on show_guestlist for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table show_advancing enable row level security;
do $$ begin
  drop policy show_advancing_rw on show_advancing;
exception when undefined_object then null; end $$;
create policy show_advancing_rw on show_advancing for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table schedule_items enable row level security;
do $$ begin
  drop policy schedule_items_rw on schedule_items;
exception when undefined_object then null; end $$;
create policy schedule_items_rw on schedule_items for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

-- Advancing detail tables
alter table advancing_flights enable row level security;
do $$ begin
  drop policy advancing_flights_rw on advancing_flights;
exception when undefined_object then null; end $$;
create policy advancing_flights_rw on advancing_flights for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table advancing_lodging enable row level security;
do $$ begin
  drop policy advancing_lodging_rw on advancing_lodging;
exception when undefined_object then null; end $$;
create policy advancing_lodging_rw on advancing_lodging for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table advancing_catering enable row level security;
do $$ begin
  drop policy advancing_catering_rw on advancing_catering;
exception when undefined_object then null; end $$;
create policy advancing_catering_rw on advancing_catering for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table advancing_team_details enable row level security;
do $$ begin
  drop policy advancing_team_details_rw on advancing_team_details;
exception when undefined_object then null; end $$;
create policy advancing_team_details_rw on advancing_team_details for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table promoter_requirements enable row level security;
do $$ begin
  drop policy promoter_requirements_rw on promoter_requirements;
exception when undefined_object then null; end $$;
create policy promoter_requirements_rw on promoter_requirements for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table promoter_transfers enable row level security;
do $$ begin
  drop policy promoter_transfers_rw on promoter_transfers;
exception when undefined_object then null; end $$;
create policy promoter_transfers_rw on promoter_transfers for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table advancing_documents enable row level security;
do $$ begin
  drop policy advancing_documents_rw on advancing_documents;
exception when undefined_object then null; end $$;
create policy advancing_documents_rw on advancing_documents for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

alter table advancing_notes enable row level security;
do $$ begin
  drop policy advancing_notes_rw on advancing_notes;
exception when undefined_object then null; end $$;
create policy advancing_notes_rw on advancing_notes for all
  using (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)))
  with check (exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id)));

-- Files
alter table files enable row level security;
do $$ begin
  drop policy files_rw on files;
exception when undefined_object then null; end $$;
create policy files_rw on files for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Ingestion
alter table parsed_emails enable row level security;
do $$ begin
  drop policy parsed_emails_rw on parsed_emails;
exception when undefined_object then null; end $$;
create policy parsed_emails_rw on parsed_emails for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table parsed_contracts enable row level security;
do $$ begin
  drop policy parsed_contracts_rw on parsed_contracts;
exception when undefined_object then null; end $$;
create policy parsed_contracts_rw on parsed_contracts for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table import_jobs enable row level security;
do $$ begin
  drop policy import_jobs_rw on import_jobs;
exception when undefined_object then null; end $$;
create policy import_jobs_rw on import_jobs for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Calendar sync
alter table calendar_sync_sources enable row level security;
do $$ begin
  drop policy calendar_sync_sources_rw on calendar_sync_sources;
exception when undefined_object then null; end $$;
create policy calendar_sync_sources_rw on calendar_sync_sources for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table calendar_sync_runs enable row level security;
do $$ begin
  drop policy calendar_sync_runs_rw on calendar_sync_runs;
exception when undefined_object then null; end $$;
create policy calendar_sync_runs_rw on calendar_sync_runs for all
  using (exists (select 1 from calendar_sync_sources css where css.id = source_id and is_org_member(css.org_id)))
  with check (exists (select 1 from calendar_sync_sources css where css.id = source_id and is_org_member(css.org_id)));

-- Activity log
alter table activity_log enable row level security;
do $$ begin
  drop policy activity_log_rw on activity_log;
exception when undefined_object then null; end $$;
create policy activity_log_rw on activity_log for all using (is_org_member(org_id)) with check (is_org_member(org_id));

----------------------------------------------------------------------
-- RPCs (security definer, bypass RLS but enforce membership)
----------------------------------------------------------------------

-- Note: parameters match frontend usage (org_name, org_slug)
create or replace function app_create_organization_with_owner(org_name text, org_slug text)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org organizations;
begin
  insert into organizations (name, slug) values (org_name, org_slug)
  returning * into v_org;

  insert into org_members (org_id, user_id, role, status)
  values (v_org.id, auth.uid(), 'owner', 'active')
  on conflict (org_id, user_id) do nothing;

  return v_org;
end;
$$;

create or replace function check_slug_available(slug_to_check text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists(select 1 from organizations o where o.slug = slug_to_check);
$$;

create or replace function get_user_organizations()
returns table (org_id uuid, name text, slug citext, role member_role, status member_status)
language sql
security definer
set search_path = public
as $$
  select o.id, o.name, o.slug, om.role, om.status
  from org_members om
  join organizations o on o.id = om.org_id
  where om.user_id = auth.uid();
$$;

create or replace function get_org_by_slug(p_slug citext)
returns organizations
language sql
security definer
set search_path = public
as $$
  select * from organizations o where o.slug = p_slug limit 1;
$$;

create or replace function get_org_by_id(p_org_id uuid)
returns organizations
language sql
security definer
set search_path = public
as $$
  select * from organizations o where o.id = p_org_id;
$$;

create or replace function get_org_membership(p_org_id uuid)
returns table(role member_role, status member_status)
language sql
security definer
set search_path = public
as $$
  select om.role, om.status
  from org_members om
  where om.org_id = p_org_id
    and om.user_id = auth.uid()
    and om.status = 'active'
  limit 1;
$$;

-- People
create or replace function create_person(
  p_org_id uuid,
  p_name text,
  p_email citext default null,
  p_phone text default null,
  p_member_type member_type default null,
  p_role_title text default null,
  p_notes text default null
)
returns people
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person people;
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;
  insert into people (org_id, name, email, phone, member_type, role_title, notes)
  values (p_org_id, p_name, p_email, p_phone, p_member_type, p_role_title, p_notes)
  returning * into v_person;
  return v_person;
end;
$$;

create or replace function get_org_people(p_org_id uuid)
returns setof people
language sql
security definer
set search_path = public
as $$
  select * from people where org_id = p_org_id;
$$;

-- Contacts / promoters
create or replace function get_org_promoters(p_org_id uuid)
returns setof contacts
language sql
security definer
set search_path = public
as $$
  select * from contacts where org_id = p_org_id and contact_type = 'promoter';
$$;

create or replace function get_org_invitations(p_org_id uuid)
returns setof invitations
language sql
security definer
set search_path = public
as $$
  select * from invitations where org_id = p_org_id;
$$;

create or replace function get_org_venues_with_counts(p_org_id uuid)
returns table (
  id uuid,
  name text,
  address text,
  city text,
  country text,
  capacity integer,
  notes text,
  created_at timestamptz,
  show_count bigint
)
language sql
security definer
set search_path = public
as $$
  select v.id, v.name, v.address, v.city, v.country, v.capacity, v.notes, v.created_at,
         coalesce((select count(*) from shows s where s.venue_id = v.id), 0) as show_count
  from venues v
  where v.org_id = p_org_id;
$$;

create or replace function get_promoters_by_venue(p_venue_id uuid)
returns table (
  id uuid,
  name text,
  email citext,
  phone text,
  company text,
  city text,
  country text,
  role text,
  contact_type contact_type,
  status contact_status,
  notes text,
  is_primary boolean
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name, c.email, c.phone, c.company, c.city, c.country, c.role, c.contact_type,
         c.status, c.notes, vc.is_primary
  from venue_contacts vc
  join contacts c on c.id = vc.contact_id
  where vc.venue_id = p_venue_id;
$$;

create or replace function search_promoters(p_org_id uuid, p_search text)
returns setof contacts
language sql
security definer
set search_path = public
as $$
  select *
  from contacts c
  where c.org_id = p_org_id
    and c.contact_type = 'promoter'
    and (
      p_search is null
      or c.name ilike '%' || p_search || '%'
      or c.email ilike '%' || p_search || '%'
      or c.city ilike '%' || p_search || '%'
      or c.company ilike '%' || p_search || '%'
    );
$$;

-- Shows and team
create or replace function get_shows_by_org(p_org_id uuid)
returns setof shows
language sql
security definer
set search_path = public
as $$
  select * from shows where org_id = p_org_id order by date desc;
$$;

create or replace function get_show_by_id(p_show_id uuid)
returns shows
language sql
security definer
set search_path = public
as $$
  select * from shows where id = p_show_id;
$$;

create or replace function get_show_team(p_show_id uuid)
returns table (
  show_id uuid,
  person_id uuid,
  duty text,
  person_name text,
  person_email citext,
  person_phone text,
  member_type member_type,
  role_title text
)
language sql
security definer
set search_path = public
as $$
  select sa.show_id, sa.person_id, sa.duty,
         p.name, p.email, p.phone, p.member_type, p.role_title
  from show_assignments sa
  join people p on p.id = sa.person_id
  where sa.show_id = p_show_id;
$$;

-- Get show assignments for multiple shows (for list views)
create or replace function get_show_assignments_for_shows(p_show_ids uuid[])
returns table (
  show_id uuid,
  person_id uuid,
  person_name text,
  member_type member_type
)
language sql
security definer
set search_path = public
as $$
  select sa.show_id, sa.person_id, p.name, p.member_type
  from show_assignments sa
  join people p on p.id = sa.person_id
  where sa.show_id = any(p_show_ids);
$$;

create or replace function get_available_people(p_org_id uuid)
returns setof people
language sql
security definer
set search_path = public
as $$
  select * from people where org_id = p_org_id;
$$;

create or replace function check_org_membership(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select is_org_member(p_org_id);
$$;

create or replace function get_org_subscription(p_org_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('org_id', p_org_id, 'status', 'active');
$$;

-- Create show with optional venue creation
create or replace function app_create_show(
  p_org_id uuid,
  p_title text,
  p_date date,
  p_venue_id uuid default null,
  p_venue_name text default null,
  p_venue_city text default null,
  p_venue_address text default null,
  p_set_time timestamptz default null,
  p_notes text default null
) returns shows
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show shows;
  v_venue_id uuid;
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;

  v_venue_id := p_venue_id;

  if v_venue_id is null and p_venue_name is not null then
    insert into venues (org_id, name, city, address)
    values (p_org_id, p_venue_name, p_venue_city, p_venue_address)
    returning id into v_venue_id;
  end if;

  insert into shows (org_id, title, date, venue_id, set_time, notes)
  values (p_org_id, p_title, p_date, v_venue_id, p_set_time, p_notes)
  returning * into v_show;

  return v_show;
end;
$$;

-- Advancing compatibility stubs mapping to show_advancing
create or replace function create_advancing_session(
  p_show_id uuid,
  p_org_id uuid,
  p_title text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;
  insert into show_advancing (id, show_id, status, created_by)
  values (gen_random_uuid(), p_show_id, 'draft', auth.uid())
  on conflict (show_id) do update set status = excluded.status
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function get_advancing_session(p_session_id uuid)
returns setof show_advancing
language sql
security definer
set search_path = public
as $$
  select * from show_advancing where id = p_session_id;
$$;

create or replace function get_org_advancing_sessions(p_org_id uuid)
returns setof show_advancing
language sql
security definer
set search_path = public
as $$
  select sa.* from show_advancing sa join shows s on s.id = sa.show_id where s.org_id = p_org_id;
$$;

create or replace function get_advancing_fields(p_session_id uuid)
returns table(field_id uuid, section text, field_name text, field_type text, party_type text, value jsonb, status text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  -- No generic fields in new schema; return empty set for compatibility
  select null::uuid, null::text, null::text, null::text, null::text, null::jsonb, null::text, null::timestamptz where false;
$$;

create or replace function create_advancing_field(
  p_session_id uuid,
  p_section text,
  p_field_name text,
  p_field_type text,
  p_party_type text,
  p_value jsonb default null,
  p_sort_order integer default 1000
) returns table(success boolean, field_id uuid, show_id uuid)
language sql
security definer
set search_path = public
as $$
  select true as success, gen_random_uuid() as field_id, (select show_id from show_advancing where id = p_session_id limit 1) as show_id;
$$;

create or replace function update_advancing_field(
  p_session_id uuid,
  p_field_id uuid,
  p_value jsonb default null
) returns table(success boolean, field_id uuid, show_id uuid)
language sql
security definer
set search_path = public
as $$
  select true as success, p_field_id as field_id, (select show_id from show_advancing where id = p_session_id limit 1) as show_id;
$$;

create or replace function get_advancing_documents(p_session_id uuid)
returns setof advancing_documents
language sql
security definer
set search_path = public
as $$
  select ad.* from advancing_documents ad where ad.show_id = (select show_id from show_advancing where id = p_session_id);
$$;

create or replace function create_advancing_document(
  p_session_id uuid,
  p_party_type advancing_party,
  p_label text default null
) returns advancing_documents
language plpgsql
security definer
set search_path = public
as $$
declare v_doc advancing_documents;
begin
  insert into advancing_documents (show_id, party, label, created_by)
  values ((select show_id from show_advancing where id = p_session_id), p_party_type, p_label, auth.uid())
  returning * into v_doc;
  return v_doc;
end;
$$;

create or replace function update_advancing_document(
  p_document_id uuid,
  p_label text
) returns advancing_documents
language plpgsql
security definer
set search_path = public
as $$
declare v_doc advancing_documents;
begin
  update advancing_documents set label = p_label where id = p_document_id returning * into v_doc;
  return v_doc;
end;
$$;

create or replace function delete_advancing_document(p_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  delete from advancing_documents where id = p_document_id;
  select true;
$$;

create or replace function upload_advancing_file(
  p_org_id uuid,
  p_document_id uuid,
  p_storage_path text,
  p_original_name text default null,
  p_content_type text default null,
  p_size_bytes bigint default null
) returns files
language plpgsql
security definer
set search_path = public
as $$
declare v_file files;
begin
  insert into files (org_id, show_id, advancing_document_id, storage_path, original_name, content_type, size_bytes, uploaded_by)
  values (p_org_id, (select show_id from advancing_documents where id = p_document_id), p_document_id, p_storage_path, p_original_name, p_content_type, p_size_bytes, auth.uid())
  returning * into v_file;
  return v_file;
end;
$$;

create or replace function delete_advancing_file(p_file_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  delete from files where id = p_file_id;
  select true;
$$;

create or replace function rename_advancing_file(p_file_id uuid, p_new_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  update files set original_name = p_new_name where id = p_file_id;
  select true;
$$;

create or replace function save_advancing_grid_data(
  p_session_id uuid,
  p_grid_type text,
  p_data jsonb
) returns boolean
language sql
security definer
set search_path = public
as $$
  select true;
$$;

create or replace function insert_parsed_email(
  p_org_id uuid,
  p_from_email citext,
  p_subject text,
  p_raw_content text,
  p_parsed_data jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into parsed_emails (org_id, from_email, subject, raw_content, parsed_data, status)
  values (p_org_id, p_from_email, p_subject, p_raw_content, p_parsed_data, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function update_parsed_email_status(
  p_email_id uuid,
  p_status ingestion_status,
  p_reviewed_by uuid default null
) returns boolean
language sql
security definer
set search_path = public
as $$
  update parsed_emails
  set status = p_status,
      reviewed_by = coalesce(p_reviewed_by, auth.uid()),
      reviewed_at = now()
  where id = p_email_id;
  select true;
$$;
create or replace function assign_person_to_show(p_show_id uuid, p_person_id uuid, p_duty text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from shows where id = p_show_id;
  insert into show_assignments (org_id, show_id, person_id, duty)
  values (v_org_id, p_show_id, p_person_id, p_duty)
  on conflict (show_id, person_id) do update set duty = excluded.duty;
  return true;
end;
$$;

create or replace function remove_person_from_show(p_show_id uuid, p_person_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from show_assignments where show_id = p_show_id and person_id = p_person_id;
  return true;
end;
$$;

-- Invitations & seats
create or replace function get_invitation_by_token(p_token text)
returns invitations
language sql
security definer
set search_path = public
as $$
  select * from invitations where token = p_token limit 1;
$$;

create or replace function accept_invitation(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv invitations;
begin
  select * into v_inv from invitations where token = p_token and status = 'pending' limit 1;
  if not found then
    return false;
  end if;
  insert into org_members (org_id, user_id, role, status)
  values (v_inv.org_id, auth.uid(), v_inv.role, 'active')
  on conflict (org_id, user_id) do nothing;
  update invitations set status = 'accepted', accepted_at = now() where id = v_inv.id;
  return true;
end;
$$;

create or replace function check_available_seats(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select true;
$$;

-- Ingestion
create or replace function get_parsed_emails(p_org_id uuid)
returns setof parsed_emails
language sql
security definer
set search_path = public
as $$
  select * from parsed_emails where org_id = p_org_id order by created_at desc;
$$;

create or replace function get_parsed_contracts(p_org_id uuid)
returns setof parsed_contracts
language sql
security definer
set search_path = public
as $$
  select * from parsed_contracts where org_id = p_org_id order by created_at desc;
$$;

-- Calendar sync
create or replace function create_calendar_sync_source(
  p_org_id uuid,
  p_source_url text,
  p_sync_interval_minutes integer,
  p_created_by uuid,
  p_source_name text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;
  insert into calendar_sync_sources (org_id, source_url, sync_interval_minutes, created_by, source_name)
  values (p_org_id, p_source_url, coalesce(p_sync_interval_minutes, 60), p_created_by, p_source_name)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function get_calendar_sync_source(p_source_id uuid, p_org_id uuid)
returns setof calendar_sync_sources
language sql
security definer
set search_path = public
as $$
  select * from calendar_sync_sources where id = p_source_id and org_id = p_org_id;
$$;

create or replace function get_calendar_sync_sources(p_org_id uuid)
returns setof calendar_sync_sources
language sql
security definer
set search_path = public
as $$
  select * from calendar_sync_sources where org_id = p_org_id order by created_at desc;
$$;

create or replace function update_calendar_sync_source(
  p_source_id uuid,
  p_org_id uuid,
  p_source_url text default null,
  p_status calendar_source_status default null,
  p_sync_interval_minutes integer default null,
  p_source_name text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update calendar_sync_sources
  set source_url = coalesce(p_source_url, source_url),
      status = coalesce(p_status, status),
      sync_interval_minutes = coalesce(p_sync_interval_minutes, sync_interval_minutes),
      source_name = coalesce(p_source_name, source_name),
      updated_at = now()
  where id = p_source_id and org_id = p_org_id;
  return true;
end;
$$;

create or replace function delete_calendar_sync_source(p_source_id uuid, p_org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from calendar_sync_sources where id = p_source_id and org_id = p_org_id;
  return true;
end;
$$;

create or replace function create_calendar_sync_run(
  p_source_id uuid,
  p_org_id uuid,
  p_status calendar_run_status,
  p_message text,
  p_events_processed integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into calendar_sync_runs (id, source_id, status, message, events_processed, started_at)
  values (gen_random_uuid(), p_source_id, coalesce(p_status, 'pending'), p_message, p_events_processed, now())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function update_calendar_sync_run_status(
  p_run_id uuid,
  p_status calendar_run_status,
  p_message text,
  p_events_processed integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update calendar_sync_runs
  set status = coalesce(p_status, status),
      message = p_message,
      events_processed = p_events_processed,
      finished_at = case when p_status in ('success','failed') then now() else finished_at end
  where id = p_run_id;
  return true;
end;
$$;

create or replace function update_calendar_source_sync_metadata(
  p_source_id uuid,
  p_org_id uuid,
  p_last_synced_at timestamptz,
  p_last_error text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update calendar_sync_sources
  set last_synced_at = coalesce(p_last_synced_at, last_synced_at),
      last_error = p_last_error,
      updated_at = now()
  where id = p_source_id and org_id = p_org_id;
  return true;
end;
$$;

create or replace function get_calendar_sync_runs(p_org_id uuid)
returns table (
  id uuid,
  source_id uuid,
  status calendar_run_status,
  started_at timestamptz,
  finished_at timestamptz,
  events_processed integer,
  message text
)
language sql
security definer
set search_path = public
as $$
  select cr.id, cr.source_id, cr.status, cr.started_at, cr.finished_at, cr.events_processed, cr.message
  from calendar_sync_runs cr
  join calendar_sync_sources cs on cs.id = cr.source_id
  where cs.org_id = p_org_id
  order by cr.started_at desc;
$$;

create or replace function get_sync_run_items(p_sync_run_id uuid)
returns table(id uuid, summary text)
language sql
security definer
set search_path = public
as $$
  -- placeholder: no per-item table; return empty set
  select null::uuid as id, null::text as summary where false;
$$;

-- Invitations lookup used in ingestion flows
create or replace function get_user_organizations_all()
returns setof organizations
language sql
security definer
set search_path = public
as $$
  select o.* from organizations o
  where exists(select 1 from org_members om where om.org_id = o.id and om.user_id = auth.uid());
$$;

-- Activity logging
create or replace function app_log_activity(
  p_org_id uuid,
  p_action text,
  p_category text,
  p_resource_type text,
  p_resource_id text,
  p_details jsonb default null
) returns boolean
language sql
security definer
set search_path = public
as $$
  insert into activity_log (org_id, action, category, resource_type, resource_id, user_id, details)
  values (p_org_id, p_action, p_category, p_resource_type, p_resource_id, auth.uid(), p_details);
  select true;
$$;

-- Billing stubs (keep frontend happy)
create or replace function app_assign_plan_debug(p_org_id uuid, p_plan text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select true;
$$;

create or replace function check_org_limits_detailed(p_org_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('ok', true, 'org_id', p_org_id);
$$;

create or replace function org_subscription_status(p_org uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select 'active';
$$;

create or replace function org_billing_dashboard(p_org_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('org_id', p_org_id, 'status', 'active');
$$;
