-- Fix org_members Policies - Remove Table Name References
-- Problem: org_members policies reference "org_members.org_id" which creates recursion
-- when evaluated from subqueries in other policies
-- Solution: Reference columns directly without table prefix since we're IN the table

DROP POLICY IF EXISTS org_members_select ON org_members;
DROP POLICY IF EXISTS org_members_insert ON org_members;
DROP POLICY IF EXISTS org_members_update ON org_members;
DROP POLICY IF EXISTS org_members_delete ON org_members;

-- SELECT: Users can view org members if they belong to the same org
CREATE POLICY org_members_select ON org_members
FOR SELECT
USING (
  -- Direct column reference, no table prefix needed
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_id  -- Reference column directly, not org_members.org_id
      AND om.user_id = auth.uid()
  )
);

-- INSERT: Only org owners can add new members
CREATE POLICY org_members_insert ON org_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_id  -- Reference column directly
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
    WHERE om.org_id = org_id  -- Reference column directly
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
    WHERE om.org_id = org_id  -- Reference column directly
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);

COMMENT ON POLICY org_members_select ON org_members IS 
'Users can view their own membership and members of orgs they belong to. Uses direct column references to avoid recursion.';

-- =====================================
-- CRITICAL EXPLANATION
-- =====================================
-- When a policy is on table X and references X.column_name in a subquery,
-- PostgreSQL can't determine if you mean:
-- 1. The outer table being queried
-- 2. The subquery table
-- 
-- This ambiguity causes infinite recursion errors.
--
-- The fix: When the policy IS on the table, reference columns directly
-- without the table prefix. Only use aliases in subqueries.
