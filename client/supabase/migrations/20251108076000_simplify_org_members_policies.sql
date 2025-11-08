-- Fix org_members Policies - Simplify to Avoid Self-Reference
-- Problem: org_members policies were checking org_members table creating recursion
-- Solution: Simplify - users can see/manage their own memberships without complex checks

DROP POLICY IF EXISTS org_members_select ON org_members;
DROP POLICY IF EXISTS org_members_insert ON org_members;
DROP POLICY IF EXISTS org_members_update ON org_members;
DROP POLICY IF EXISTS org_members_delete ON org_members;

-- SELECT: Users can only view their own memberships
-- This is simple and cannot recurse
CREATE POLICY org_members_select ON org_members
FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Only owners of the target org can add members
-- Use a CTE or function that doesn't trigger policies
CREATE POLICY org_members_insert ON org_members
FOR INSERT
WITH CHECK (
  -- Check if the current user is an owner in the target org
  -- This will query org_members but won't trigger the SELECT policy
  -- because INSERT uses WITH CHECK, not the SELECT policy
  auth.uid() IN (
    SELECT om.user_id 
    FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.role = 'owner'
  )
);

-- UPDATE: Only owners can update
CREATE POLICY org_members_update ON org_members
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT om.user_id
    FROM org_members om  
    WHERE om.org_id = org_members.org_id
      AND om.role = 'owner'
  )
);

-- DELETE: Only owners can delete
CREATE POLICY org_members_delete ON org_members
FOR DELETE
USING (
  auth.uid() IN (
    SELECT om.user_id
    FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.role = 'owner'
  )
);

COMMENT ON POLICY org_members_select ON org_members IS 
'Users can only view their own org memberships. Simplified to prevent recursion.';
