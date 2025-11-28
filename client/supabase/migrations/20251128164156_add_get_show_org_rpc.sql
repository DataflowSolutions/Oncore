-- Add RPC function to get show org_id safely (bypasses RLS)
-- This is needed for file uploads where we need the org_id for storage paths

create or replace function get_show_org_id(p_show_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Check access first
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  -- Get org_id
  select org_id into v_org_id
  from shows
  where id = p_show_id;

  return v_org_id;
end;
$$;
