-- Fix contacts RLS policies to avoid org_members recursion
-- Problem: Policies were checking org_members which now only returns user's own memberships
-- Solution: Use helper function or simplified policies

-- Drop existing policies
DROP POLICY IF EXISTS "Org members can view contacts" ON contacts;
DROP POLICY IF EXISTS "Org owners/admins can manage contacts" ON contacts;
DROP POLICY IF EXISTS contacts_select_unified ON contacts;

-- Create helper function to check if user is org member (uses service role context)
CREATE OR REPLACE FUNCTION is_org_member_for_contact(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
    AND user_id = auth.uid()
  );
$$;

-- Create helper function to check if user has editor role or higher
CREATE OR REPLACE FUNCTION is_org_editor_for_contact(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'editor')
  );
$$;

-- SELECT: Org members can view contacts
CREATE POLICY contacts_select ON contacts
FOR SELECT
TO authenticated
USING (is_org_member_for_contact(org_id));

-- INSERT: Editors and above can create contacts
CREATE POLICY contacts_insert ON contacts
FOR INSERT
TO authenticated
WITH CHECK (is_org_editor_for_contact(org_id));

-- UPDATE: Editors and above can update contacts
CREATE POLICY contacts_update ON contacts
FOR UPDATE
TO authenticated
USING (is_org_editor_for_contact(org_id))
WITH CHECK (is_org_editor_for_contact(org_id));

-- DELETE: Editors and above can delete contacts
CREATE POLICY contacts_delete ON contacts
FOR DELETE
TO authenticated
USING (is_org_editor_for_contact(org_id));

-- Service role bypass
CREATE POLICY contacts_service_role_all ON contacts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON FUNCTION is_org_member_for_contact IS 'SECURITY DEFINER function to check org membership without recursion';
COMMENT ON FUNCTION is_org_editor_for_contact IS 'SECURITY DEFINER function to check editor permissions without recursion';
