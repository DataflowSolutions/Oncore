-- Fix has_show_access function to properly bypass RLS
-- The issue was that security definer wasn't enough - we need to explicitly query without RLS

-- Drop and recreate the has_show_access function with proper RLS bypass
create or replace function has_show_access(p_show_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_has_access boolean;
begin
  -- First get the org_id for the show (bypass RLS by using security definer context)
  select org_id into v_org_id
  from shows
  where id = p_show_id;
  
  if v_org_id is null then
    return false;
  end if;
  
  -- Then check if the current user is an active member of that org
  select exists (
    select 1
    from org_members
    where org_id = v_org_id
      and user_id = auth.uid()
      and status = 'active'
  ) into v_has_access;
  
  return v_has_access;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function has_show_access(uuid) to authenticated;
