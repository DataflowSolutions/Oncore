-- Fix org_members INSERT policy to allow self-insertion during org creation
-- Problem: Can't insert first owner because policy checks for existing owners
-- Solution: Allow users to insert themselves OR be inserted by existing owners

DROP POLICY IF EXISTS org_members_insert ON org_members;

CREATE POLICY org_members_insert ON org_members
FOR INSERT
WITH CHECK (
  -- Allow inserting yourself as a member
  user_id = auth.uid()
  OR
  -- OR allow if the current user is an owner in the target org
  auth.uid() IN (
    SELECT om.user_id 
    FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.role = 'owner'
  )
);

COMMENT ON POLICY org_members_insert ON org_members IS 
'Users can insert themselves as members OR owners can add members to their orgs.';
