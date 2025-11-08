-- Fix: Add service_role bypass policies for organizations and org_members
-- Problem: Service role is being blocked by RLS even though it should bypass
-- Solution: Add explicit service_role policies for all operations

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS organizations_service_role_all ON public.organizations;

-- Allow service_role full access to organizations
CREATE POLICY organizations_service_role_all
  ON public.organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY organizations_service_role_all ON public.organizations IS 
  'Allow service_role full access to organizations table for admin operations';

-- ============================================================================
-- ORG_MEMBERS TABLE  
-- ============================================================================

DROP POLICY IF EXISTS org_members_service_role_all ON public.org_members;

-- Allow service_role full access to org_members
CREATE POLICY org_members_service_role_all
  ON public.org_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY org_members_service_role_all ON public.org_members IS 
  'Allow service_role full access to org_members table for admin operations';

-- ============================================================================
-- ORG_SUBSCRIPTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS org_subscriptions_service_role_all ON public.org_subscriptions;

-- Allow service_role full access to org_subscriptions
CREATE POLICY org_subscriptions_service_role_all
  ON public.org_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY org_subscriptions_service_role_all ON public.org_subscriptions IS 
  'Allow service_role full access to org_subscriptions table for admin operations';
