-- Fix org_delete Policy - Add Table Alias to Prevent Recursion
-- The org_delete policy also queries org_members without an alias

DROP POLICY IF EXISTS org_delete ON organizations;

CREATE POLICY org_delete ON organizations
FOR DELETE
USING (
  id IN (
    SELECT om.org_id  -- Added alias!
    FROM org_members om  -- Added alias!
    WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

COMMENT ON POLICY org_delete ON organizations IS 
'Only owners and admins can delete organizations. Uses aliased subquery to prevent recursion.';
