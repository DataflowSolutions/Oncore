-- Add RPC functions for venue operations to bypass RLS issues
-- These functions use SECURITY DEFINER to execute with elevated privileges
-- while still checking permissions internally

-- ============================================================================
-- GET VENUE DETAILS RPC
-- Returns venue info with associated shows
-- ============================================================================

create or replace function get_venue_details(p_venue_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_org_id uuid;
  v_venue json;
  v_shows json;
  v_contacts json;
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

  -- Check membership
  select role into v_role
  from org_members
  where org_id = v_org_id
    and user_id = v_user_id
    and status = 'active';

  if v_role is null then
    raise exception 'Access denied';
  end if;

  -- Get venue details
  select json_build_object(
    'id', v.id,
    'org_id', v.org_id,
    'name', v.name,
    'address', v.address,
    'city', v.city,
    'country', v.country,
    'capacity', v.capacity,
    'notes', v.notes,
    'created_at', v.created_at
  ) into v_venue
  from venues v
  where v.id = p_venue_id;

  -- Get shows at this venue
  select coalesce(json_agg(
    json_build_object(
      'id', s.id,
      'title', s.title,
      'date', s.date,
      'status', s.status,
      'doors_at', s.doors_at,
      'set_time', s.set_time
    ) order by s.date desc
  ), '[]'::json) into v_shows
  from shows s
  where s.venue_id = p_venue_id;

  -- Get contacts linked to this venue
  select coalesce(json_agg(
    json_build_object(
      'id', c.id,
      'name', c.name,
      'email', c.email,
      'phone', c.phone,
      'company', c.company,
      'contact_type', c.contact_type,
      'is_primary', vc.is_primary,
      'role_label', vc.role_label
    )
  ), '[]'::json) into v_contacts
  from venue_contacts vc
  join contacts c on c.id = vc.contact_id
  where vc.venue_id = p_venue_id;

  return json_build_object(
    'venue', v_venue,
    'shows', v_shows,
    'contacts', v_contacts
  );
end;
$$;

-- ============================================================================
-- CREATE VENUE RPC
-- ============================================================================

create or replace function create_venue(
  p_org_id uuid,
  p_name text,
  p_address text default null,
  p_city text default null,
  p_country text default null,
  p_capacity integer default null,
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
  v_venue_id uuid;
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

  -- Insert the venue
  insert into venues (
    org_id,
    name,
    address,
    city,
    country,
    capacity,
    notes
  ) values (
    p_org_id,
    p_name,
    p_address,
    p_city,
    p_country,
    p_capacity,
    p_notes
  )
  returning id into v_venue_id;

  -- Return the created venue
  select json_build_object(
    'id', v.id,
    'org_id', v.org_id,
    'name', v.name,
    'address', v.address,
    'city', v.city,
    'country', v.country,
    'capacity', v.capacity,
    'notes', v.notes,
    'created_at', v.created_at
  ) into v_result
  from venues v
  where v.id = v_venue_id;

  return v_result;
end;
$$;

-- ============================================================================
-- UPDATE VENUE RPC
-- ============================================================================

create or replace function update_venue(
  p_venue_id uuid,
  p_name text default null,
  p_address text default null,
  p_city text default null,
  p_country text default null,
  p_capacity integer default null,
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

  -- Update the venue (only non-null values)
  update venues
  set
    name = coalesce(p_name, name),
    address = coalesce(p_address, address),
    city = coalesce(p_city, city),
    country = coalesce(p_country, country),
    capacity = coalesce(p_capacity, capacity),
    notes = coalesce(p_notes, notes)
  where id = p_venue_id;

  -- Return the updated venue
  select json_build_object(
    'id', v.id,
    'org_id', v.org_id,
    'name', v.name,
    'address', v.address,
    'city', v.city,
    'country', v.country,
    'capacity', v.capacity,
    'notes', v.notes,
    'created_at', v.created_at
  ) into v_result
  from venues v
  where v.id = p_venue_id;

  return v_result;
end;
$$;

-- ============================================================================
-- DELETE VENUE RPC
-- ============================================================================

create or replace function delete_venue(p_venue_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_org_id uuid;
  v_show_count integer;
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

  -- Check if venue has shows
  select count(*) into v_show_count
  from shows
  where venue_id = p_venue_id;

  if v_show_count > 0 then
    return json_build_object(
      'success', false,
      'error', 'Cannot delete venue with existing shows. Please remove or move shows first.'
    );
  end if;

  -- Delete the venue
  delete from venues where id = p_venue_id;

  return json_build_object('success', true);
end;
$$;
