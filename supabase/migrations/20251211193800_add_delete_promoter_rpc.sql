-- ============================================================================
-- DELETE PROMOTER (CONTACT) RPC
-- ============================================================================

create or replace function app_delete_promoter(
  p_promoter_id uuid
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
  v_show_count integer;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get the contact's (promoter's) org_id
  -- Promoters are stored in the contacts table with contact_type = 'promoter'
  select org_id into v_org_id
  from contacts
  where id = p_promoter_id;

  if v_org_id is null then
    raise exception 'Promoter not found';
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

  -- Check if promoter is linked to any shows via show_contacts
  select count(*) into v_show_count
  from show_contacts
  where contact_id = p_promoter_id;

  if v_show_count > 0 then
    return json_build_object(
      'success', false,
      'error', 'Cannot delete promoter linked to shows. Please remove from shows first.'
    );
  end if;

  -- Check if promoter is linked to any venues via venue_contacts
  -- We'll also remove these links before deleting
  delete from venue_contacts where contact_id = p_promoter_id;

  -- Delete the contact (promoter)
  delete from contacts where id = p_promoter_id;

  return json_build_object(
    'success', true
  );
end;
$$;
