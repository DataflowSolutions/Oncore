-- Migration: Allow service_role to bypass RLS on organizations table
-- Date: 2025-11-08 11:00:00
-- Description: Adds explicit policy to allow service_role full access to organizations table
-- This is needed for slug availability checks during org creation

-- =====================================
-- ADD SERVICE ROLE POLICY
-- =====================================

-- Allow service_role full access to organizations table
CREATE POLICY organizations_service_role_all
  ON public.organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY organizations_service_role_all ON public.organizations IS 
  'Allow service_role full access to organizations table for admin operations like slug checks';

-- =====================================
-- VERIFICATION
-- =====================================

-- The following query can be used to verify the policy was created:
-- SELECT policyname, roles::text[], cmd, qual::text, with_check::text
-- FROM pg_policies 
-- WHERE tablename = 'organizations'
-- ORDER BY policyname;
