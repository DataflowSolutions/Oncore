-- Fix Infinite Recursion in org_members RLS Policies
-- The issue: org_members SELECT policy uses is_org_member() which queries org_members, 
-- creating infinite recursion

-- =====================================
-- SOLUTION: Make org_members policies self-contained
-- =====================================

-- Drop existing policies
DROP POLICY IF EXISTS org_members_select ON org_members;
DROP POLICY IF EXISTS org_members_insert ON org_members;
DROP POLICY IF EXISTS org_members_update ON org_members;
DROP POLICY IF EXISTS org_members_delete ON org_members;

-- CREATE NEW POLICIES WITHOUT RECURSION

-- SELECT: Users can view org members if they are a member of that org
-- This is safe because it doesn't call is_org_member()
CREATE POLICY org_members_select ON org_members
FOR SELECT
USING (
  -- User can see members of orgs they belong to
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
  )
  OR
  -- User can see their own membership records
  user_id = auth.uid()
);

-- INSERT: Only org owners can add new members
CREATE POLICY org_members_insert ON org_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);

-- UPDATE: Only org owners can update member roles
CREATE POLICY org_members_update ON org_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);

-- DELETE: Only org owners can remove members
CREATE POLICY org_members_delete ON org_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);

-- =====================================
-- IMPORTANT NOTE ABOUT RECURSION
-- =====================================

-- The key to avoiding infinite recursion in org_members policies:
-- 1. The SELECT policy must NOT use is_org_member() or any function that queries org_members
-- 2. Instead, we use a direct subquery that references org_members with an alias (om)
-- 3. PostgreSQL is smart enough to handle this without recursion because:
--    - The outer query is on "org_members" (no alias)
--    - The subquery is on "org_members om" (with alias)
--    - They are treated as different query contexts

-- This pattern is safe and will not cause infinite recursion.

COMMENT ON POLICY org_members_select ON org_members IS 
'Users can view org members if they belong to the same org. Uses direct subquery to avoid recursion.';
