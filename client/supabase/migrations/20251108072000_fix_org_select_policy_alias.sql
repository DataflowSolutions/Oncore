-- Fix org_select Policy - Add Table Alias to Prevent Recursion
-- The org_select policy queries org_members without an alias, which causes
-- recursion when org_members_select policy is evaluated

DROP POLICY IF EXISTS org_select ON organizations;

CREATE POLICY org_select ON organizations
FOR SELECT
USING (
  id IN (
    SELECT om.org_id  -- Added alias!
    FROM org_members om  -- Added alias!
    WHERE om.user_id = auth.uid()
  )
);

COMMENT ON POLICY org_select ON organizations IS 
'Users can view organizations they are members of. Uses aliased subquery to prevent recursion.';
