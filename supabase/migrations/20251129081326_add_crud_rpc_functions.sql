-- Add RPC functions for CRUD operations to bypass RLS issues in production
-- These functions use SECURITY DEFINER to execute with elevated privileges
-- while still checking permissions internally

-- ============================================================================
-- CREATE CONTACT (Promoter) RPC
-- ============================================================================

create or replace function create_contact(
  p_org_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_company text default null,
  p_city text default null,
  p_country text default null,
  p_notes text default null,
  p_contact_type contact_type default 'promoter',
  p_status contact_status default 'active'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_contact_id uuid;
  v_result json;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check membership and role
  select role into v_role
  from org_members
  where org_id = p_org_id
    and user_id = v_user_id
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'Insufficient permissions';
  end if;

  -- Insert the contact
  insert into contacts (
    org_id,
    name,
    email,
    phone,
    company,
    city,
    country,
    notes,
    contact_type,
    status
  ) values (
    p_org_id,
    p_name,
    p_email,
    p_phone,
    p_company,
    p_city,
    p_country,
    p_notes,
    p_contact_type,
    p_status
  )
  returning id into v_contact_id;

  -- Return the created contact
  select json_build_object(
    'id', c.id,
    'org_id', c.org_id,
    'name', c.name,
    'email', c.email,
    'phone', c.phone,
    'company', c.company,
    'city', c.city,
    'country', c.country,
    'notes', c.notes,
    'contact_type', c.contact_type,
    'status', c.status,
    'created_at', c.created_at
  ) into v_result
  from contacts c
  where c.id = v_contact_id;

  return v_result;
end;
$$;

-- ============================================================================
-- UPDATE CONTACT RPC
-- ============================================================================

create or replace function update_contact(
  p_contact_id uuid,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_company text default null,
  p_city text default null,
  p_country text default null,
  p_notes text default null,
  p_status contact_status default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_org_id uuid;
  v_result json;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get the contact's org_id
  select org_id into v_org_id
  from contacts
  where id = p_contact_id;

  if v_org_id is null then
    raise exception 'Contact not found';
  end if;

  -- Check membership and role
  select role into v_role
  from org_members
  where org_id = v_org_id
    and user_id = v_user_id
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'Insufficient permissions';
  end if;

  -- Update the contact (only non-null values)
  update contacts
  set
    name = coalesce(p_name, name),
    email = coalesce(p_email, email),
    phone = coalesce(p_phone, phone),
    company = coalesce(p_company, company),
    city = coalesce(p_city, city),
    country = coalesce(p_country, country),
    notes = coalesce(p_notes, notes),
    status = coalesce(p_status, status)
  where id = p_contact_id;

  -- Return the updated contact
  select json_build_object(
    'id', c.id,
    'org_id', c.org_id,
    'name', c.name,
    'email', c.email,
    'phone', c.phone,
    'company', c.company,
    'city', c.city,
    'country', c.country,
    'notes', c.notes,
    'contact_type', c.contact_type,
    'status', c.status,
    'created_at', c.created_at
  ) into v_result
  from contacts c
  where c.id = p_contact_id;

  return v_result;
end;
$$;

-- ============================================================================
-- DELETE CONTACT RPC (soft delete)
-- ============================================================================

create or replace function delete_contact(
  p_contact_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_org_id uuid;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get the contact's org_id
  select org_id into v_org_id
  from contacts
  where id = p_contact_id;

  if v_org_id is null then
    raise exception 'Contact not found';
  end if;

  -- Check membership and role
  select role into v_role
  from org_members
  where org_id = v_org_id
    and user_id = v_user_id
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'Insufficient permissions';
  end if;

  -- Soft delete by setting status to inactive
  update contacts
  set status = 'inactive'
  where id = p_contact_id;

  return true;
end;
$$;

-- ============================================================================
-- LINK CONTACT TO VENUE RPC
-- ============================================================================

create or replace function link_contact_to_venue(
  p_venue_id uuid,
  p_contact_id uuid,
  p_is_primary boolean default false,
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_org_id uuid;
  v_link_id uuid;
  v_result json;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get the venue's org_id
  select org_id into v_org_id
  from venues
  where id = p_venue_id;

  if v_org_id is null then
    raise exception 'Venue not found';
  end if;

  -- Check membership and role
  select role into v_role
  from org_members
  where org_id = v_org_id
    and user_id = v_user_id
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'Insufficient permissions';
  end if;

  -- If setting as primary, unset other primary contacts for this venue
  if p_is_primary then
    update venue_contacts
    set is_primary = false
    where venue_id = p_venue_id;
  end if;

  -- Insert the link
  insert into venue_contacts (
    venue_id,
    contact_id,
    is_primary,
    notes
  ) values (
    p_venue_id,
    p_contact_id,
    p_is_primary,
    p_notes
  )
  returning id into v_link_id;

  -- Return the created link
  select json_build_object(
    'id', vc.id,
    'venue_id', vc.venue_id,
    'contact_id', vc.contact_id,
    'is_primary', vc.is_primary,
    'notes', vc.notes,
    'created_at', vc.created_at
  ) into v_result
  from venue_contacts vc
  where vc.id = v_link_id;

  return v_result;
end;
$$;

-- ============================================================================
-- UNLINK CONTACT FROM VENUE RPC
-- ============================================================================

create or replace function unlink_contact_from_venue(
  p_venue_id uuid,
  p_contact_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_org_id uuid;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get the venue's org_id
  select org_id into v_org_id
  from venues
  where id = p_venue_id;

  if v_org_id is null then
    raise exception 'Venue not found';
  end if;

  -- Check membership and role
  select role into v_role
  from org_members
  where org_id = v_org_id
    and user_id = v_user_id
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'Insufficient permissions';
  end if;

  -- Delete the link
  delete from venue_contacts
  where venue_id = p_venue_id
    and contact_id = p_contact_id;

  return true;
end;
$$;
