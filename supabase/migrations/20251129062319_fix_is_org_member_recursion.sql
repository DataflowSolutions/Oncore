-- Fix is_org_member function to avoid RLS recursion
-- The issue: is_org_member queries org_members, which has RLS using is_org_member
-- Solution: Make is_org_member a security definer function to bypass RLS

create or replace function is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from org_members om
    where om.org_id = p_org
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

-- Also fix the org_members RLS policy to allow users to see their own memberships
-- without needing is_org_member (which would still cause recursion on INSERT for new orgs)

-- Drop existing policies
drop policy if exists org_members_select on org_members;
drop policy if exists org_members_ins on org_members;
drop policy if exists org_members_upd on org_members;
drop policy if exists org_members_del on org_members;

-- Recreate with direct auth check for select (users can see orgs they're members of)
create policy org_members_select on org_members 
  for select 
  using (user_id = auth.uid() or is_org_member(org_id));

-- For insert: either you're already a member (inviting others) or you're adding yourself to a new org
create policy org_members_ins on org_members 
  for insert 
  with check (user_id = auth.uid() or is_org_member(org_id));

-- Update/delete: must be a member
create policy org_members_upd on org_members 
  for update 
  using (is_org_member(org_id)) 
  with check (is_org_member(org_id));

create policy org_members_del on org_members 
  for delete 
  using (is_org_member(org_id));
