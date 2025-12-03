-- Fix app_update_person RPC to use role_title instead of non-existent role column
-- ============================================================================
-- UPDATE PERSON RPC (FIXED)
-- ============================================================================

-- Drop the existing function first since we're changing parameter names
drop function if exists app_update_person(uuid, text, text, text, text, text);

create or replace function app_update_person(
  p_person_id uuid,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_role_title text default null,
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
    role_title = coalesce(p_role_title, role_title),
    notes = coalesce(p_notes, notes)
  where id = p_person_id;

  -- Return the updated person
  select json_build_object(
    'id', id,
    'org_id', org_id,
    'name', name,
    'email', email,
    'phone', phone,
    'role_title', role_title,
    'notes', notes,
    'member_type', member_type
  ) into v_result
  from people
  where id = p_person_id;

  return v_result;
end;
$$;
