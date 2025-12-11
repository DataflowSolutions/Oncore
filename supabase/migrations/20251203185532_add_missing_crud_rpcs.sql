-- Add missing RPC functions for CRUD operations
-- These functions use SECURITY DEFINER to bypass RLS while checking permissions internally

-- ============================================================================
-- UPDATE SHOW RPC
-- ============================================================================

create or replace function app_update_show(
  p_show_id uuid,
  p_title text default null,
  p_date date default null,
  p_venue_id uuid default null,
  p_set_time timestamptz default null,
  p_doors_at timestamptz default null,
  p_notes text default null,
  p_status show_status default null
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

  -- Get the show's org_id
  select org_id into v_org_id
  from shows
  where id = p_show_id;

  if v_org_id is null then
    raise exception 'Show not found';
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

  -- Update the show (only non-null values)
  update shows
  set
    title = coalesce(p_title, title),
    date = coalesce(p_date, date),
    venue_id = coalesce(p_venue_id, venue_id),
    set_time = coalesce(p_set_time, set_time),
    doors_at = coalesce(p_doors_at, doors_at),
    notes = coalesce(p_notes, notes),
    status = coalesce(p_status, status),
    updated_at = now()
  where id = p_show_id;

  -- Return the updated show
  select json_build_object(
    'id', s.id,
    'org_id', s.org_id,
    'title', s.title,
    'date', s.date,
    'venue_id', s.venue_id,
    'set_time', s.set_time,
    'doors_at', s.doors_at,
    'notes', s.notes,
    'status', s.status,
    'created_at', s.created_at,
    'updated_at', s.updated_at
  ) into v_result
  from shows s
  where s.id = p_show_id;

  return v_result;
end;
$$;

-- ============================================================================
-- DELETE SHOW RPC
-- ============================================================================

create or replace function app_delete_show(
  p_show_id uuid
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

  -- Get the show's org_id
  select org_id into v_org_id
  from shows
  where id = p_show_id;

  if v_org_id is null then
    raise exception 'Show not found';
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

  -- Delete the show (cascading will handle related records)
  delete from shows
  where id = p_show_id;

  return true;
end;
$$;

-- ============================================================================
-- UPDATE PERSON RPC
-- ============================================================================

create or replace function app_update_person(
  p_person_id uuid,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_role text default null,
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

  -- Get the person's org_id
  select org_id into v_org_id
  from people
  where id = p_person_id;

  if v_org_id is null then
    raise exception 'Person not found';
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

  -- Update the person (only non-null values)
  update people
  set
    name = coalesce(p_name, name),
    email = coalesce(p_email, email),
    phone = coalesce(p_phone, phone),
    role = coalesce(p_role, role),
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_person_id;

  -- Return the updated person
  select json_build_object(
    'id', p.id,
    'org_id', p.org_id,
    'name', p.name,
    'email', p.email,
    'phone', p.phone,
    'role', p.role,
    'notes', p.notes,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) into v_result
  from people p
  where p.id = p_person_id;

  return v_result;
end;
$$;

-- ============================================================================
-- DELETE PERSON RPC
-- ============================================================================

create or replace function app_delete_person(
  p_person_id uuid
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

  -- Get the person's org_id
  select org_id into v_org_id
  from people
  where id = p_person_id;

  if v_org_id is null then
    raise exception 'Person not found';
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

  -- Delete the person
  delete from people
  where id = p_person_id;

  return true;
end;
$$;

-- ============================================================================
-- UPDATE ORG MEMBER ROLE RPC
-- ============================================================================

create or replace function app_update_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_new_role text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_current_user_role text;
  v_target_role text;
  v_owner_count integer;
  v_result json;
begin
  -- Get current user
  v_current_user_id := auth.uid();
  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get current user's role
  select role into v_current_user_role
  from org_members
  where org_id = p_org_id
    and user_id = v_current_user_id
    and status = 'active';

  if v_current_user_role is null or v_current_user_role not in ('owner', 'admin') then
    raise exception 'Insufficient permissions to update roles';
  end if;

  -- Get target member's current role
  select role into v_target_role
  from org_members
  where org_id = p_org_id
    and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'Member not found';
  end if;

  -- Prevent admins from changing owner roles
  if v_current_user_role = 'admin' and v_target_role = 'owner' then
    raise exception 'Admins cannot modify owner roles';
  end if;

  -- Prevent admins from promoting to owner
  if v_current_user_role = 'admin' and p_new_role = 'owner' then
    raise exception 'Admins cannot promote users to owner';
  end if;

  -- Prevent demoting the last owner
  if v_current_user_id = p_user_id and v_target_role = 'owner' and p_new_role != 'owner' then
    select count(*) into v_owner_count
    from org_members
    where org_id = p_org_id
      and role = 'owner'
      and status = 'active';

    if v_owner_count <= 1 then
      raise exception 'Cannot demote the only owner. Transfer ownership first.';
    end if;
  end if;

  -- Update the role
  update org_members
  set role = p_new_role
  where org_id = p_org_id
    and user_id = p_user_id;

  -- Return the updated member
  select json_build_object(
    'id', om.id,
    'org_id', om.org_id,
    'user_id', om.user_id,
    'role', om.role,
    'status', om.status
  ) into v_result
  from org_members om
  where om.org_id = p_org_id
    and om.user_id = p_user_id;

  return v_result;
end;
$$;

-- ============================================================================
-- REMOVE ORG MEMBER RPC
-- ============================================================================

create or replace function app_remove_member(
  p_org_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_current_user_role text;
  v_target_role text;
  v_owner_count integer;
begin
  -- Get current user
  v_current_user_id := auth.uid();
  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get current user's role
  select role into v_current_user_role
  from org_members
  where org_id = p_org_id
    and user_id = v_current_user_id
    and status = 'active';

  if v_current_user_role is null or v_current_user_role not in ('owner', 'admin') then
    raise exception 'Insufficient permissions to remove members';
  end if;

  -- Get target member's role
  select role into v_target_role
  from org_members
  where org_id = p_org_id
    and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'Member not found';
  end if;

  -- Prevent admins from removing owners
  if v_current_user_role = 'admin' and v_target_role = 'owner' then
    raise exception 'Admins cannot remove owners';
  end if;

  -- Prevent removing the last owner
  if v_target_role = 'owner' then
    select count(*) into v_owner_count
    from org_members
    where org_id = p_org_id
      and role = 'owner'
      and status = 'active';

    if v_owner_count <= 1 then
      raise exception 'Cannot remove the only owner. Transfer ownership first.';
    end if;
  end if;

  -- Remove the member
  delete from org_members
  where org_id = p_org_id
    and user_id = p_user_id;

  return true;
end;
$$;

-- ============================================================================
-- BULK INSERT SCHEDULE ITEMS RPC
-- ============================================================================

create or replace function app_insert_schedule_items(
  p_items jsonb
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
  v_item jsonb;
  v_inserted_count integer := 0;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if we have items
  if jsonb_array_length(p_items) = 0 then
    return json_build_object('success', true, 'inserted', 0);
  end if;

  -- Get org_id from first item
  v_org_id := (p_items->0->>'org_id')::uuid;

  -- Check membership and role
  select role into v_role
  from org_members
  where org_id = v_org_id
    and user_id = v_user_id
    and status = 'active';

  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'Insufficient permissions';
  end if;

  -- Insert all items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into schedule_items (
      org_id,
      show_id,
      title,
      starts_at,
      ends_at,
      location,
      item_type,
      visibility,
      person_id,
      notes,
      auto_generated,
      source,
      source_ref,
      priority
    ) values (
      (v_item->>'org_id')::uuid,
      (v_item->>'show_id')::uuid,
      v_item->>'title',
      (v_item->>'starts_at')::timestamptz,
      (v_item->>'ends_at')::timestamptz,
      v_item->>'location',
      coalesce(v_item->>'item_type', 'custom'),
      coalesce(v_item->>'visibility', 'all'),
      (v_item->>'person_id')::uuid,
      v_item->>'notes',
      coalesce((v_item->>'auto_generated')::boolean, false),
      v_item->>'source',
      v_item->>'source_ref',
      coalesce((v_item->>'priority')::integer, 0)
    );
    v_inserted_count := v_inserted_count + 1;
  end loop;

  return json_build_object('success', true, 'inserted', v_inserted_count);
end;
$$;
