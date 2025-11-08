-- Fix Organizations Policies to Avoid Recursion
-- The org_update policy uses is_org_member() which causes recursion
-- when is_org_member queries org_members table

-- Drop and recreate org_update policy without using is_org_member()
DROP POLICY IF EXISTS org_update ON organizations;

CREATE POLICY org_update ON organizations
FOR UPDATE
USING (
  -- User must be a member of the org (direct subquery instead of is_org_member)
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = organizations.id
      AND om.user_id = auth.uid()
  )
);

COMMENT ON POLICY org_update ON organizations IS 
'Users can update orgs they belong to. Uses direct subquery to avoid recursion with org_members policies.';
