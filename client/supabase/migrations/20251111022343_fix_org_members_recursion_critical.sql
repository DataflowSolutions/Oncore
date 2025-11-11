-- Fix Critical: org_members infinite recursion
-- Problem: INSERT/UPDATE/DELETE policies check org_members table creating recursion
-- Solution: Remove recursive checks, rely on SECURITY DEFINER functions for creation

-- Drop all existing policies
DROP POLICY IF EXISTS org_members_select ON org_members;
DROP POLICY IF EXISTS org_members_insert ON org_members;
DROP POLICY IF EXISTS org_members_update ON org_members;
DROP POLICY IF EXISTS org_members_delete ON org_members;
DROP POLICY IF EXISTS org_members_service_role_all ON org_members;

-- SELECT: Users can view their own memberships
-- This is the only safe policy that doesn't cause recursion
CREATE POLICY org_members_select ON org_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: BLOCKED for normal users - only SECURITY DEFINER functions can insert
-- (like app_create_organization_with_owner)
-- No policy = no access except through SECURITY DEFINER functions

-- UPDATE: BLOCKED - role changes should go through proper functions
-- No policy = no access except through SECURITY DEFINER functions

-- DELETE: BLOCKED for normal users - use invitation/removal functions instead
-- No policy = no access

-- Service role bypass (for admin operations and SECURITY DEFINER functions)
CREATE POLICY org_members_service_role_all ON org_members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY org_members_select ON org_members IS 
'Users can only view their own memberships. No recursion.';

COMMENT ON POLICY org_members_service_role_all ON org_members IS 
'Service role and SECURITY DEFINER functions bypass all RLS.';
