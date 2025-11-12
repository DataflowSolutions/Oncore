-- Fix RLS helper functions to work with transaction pooler
-- The issue: Even SECURITY DEFINER functions hit RLS on org_members with pooler
-- Solution: Explicitly disable row security for these helper functions
-- Note: Using CREATE OR REPLACE instead of DROP to preserve policy dependencies

-- Recreate is_org_editor_and_active with row_security disabled
CREATE OR REPLACE FUNCTION is_org_editor_and_active(p_org uuid)
RETURNS boolean 
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = p_org
      AND om.user_id = auth.uid()
      AND om.role IN ('owner','admin','editor')
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  );
END;
$$;

-- Recreate is_org_member_and_active with row_security disabled
CREATE OR REPLACE FUNCTION is_org_member_and_active(p_org uuid)
RETURNS boolean 
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM org_members om
    JOIN org_subscriptions os ON os.org_id = om.org_id
    WHERE om.org_id = p_org
      AND om.user_id = auth.uid()
      AND os.status IN ('trialing','active','past_due')
      AND COALESCE(os.current_period_end, now() + INTERVAL '1 day') > now()
  );
END;
$$;

-- Recreate is_org_member with row_security disabled
CREATE OR REPLACE FUNCTION is_org_member(p_org uuid)
RETURNS boolean 
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM org_members om
    WHERE om.org_id = p_org
      AND om.user_id = auth.uid()
  );
END;
$$;
