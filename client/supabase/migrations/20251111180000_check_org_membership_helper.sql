-- Helper function to check org membership (bypasses RLS issues with transaction pooler)
-- This function MUST be created before other RPCs that use it

DROP FUNCTION IF EXISTS check_org_membership(uuid, uuid);

CREATE OR REPLACE FUNCTION check_org_membership(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
END;
$$;

COMMENT ON FUNCTION check_org_membership IS 
'Security definer helper to check org membership. Bypasses RLS issues with transaction pooler.';
