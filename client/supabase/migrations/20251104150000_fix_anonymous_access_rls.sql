-- Migration: Fix Anonymous Access to Organizations and Org Members
-- Date: 2025-11-04
-- Description: Blocks unauthenticated users from accessing organizations and org_members tables
-- Issue: Security test revealed anonymous users could read these tables

-- =====================================
-- FIX ORGANIZATIONS POLICIES
-- =====================================

-- Drop ALL existing policies on organizations
DROP POLICY IF EXISTS org_select ON organizations;
DROP POLICY IF EXISTS "Enable read access for organization members" ON organizations;
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_select_authenticated ON organizations;

-- Create new policy that explicitly requires authentication
CREATE POLICY org_select ON organizations 
  FOR SELECT 
  USING (
    -- Must be authenticated AND be a member of the organization
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM org_members 
      WHERE org_members.org_id = organizations.id 
      AND org_members.user_id = auth.uid()
    )
  );

-- =====================================
-- FIX ORG MEMBERS POLICIES
-- =====================================

-- Drop ALL existing policies on org_members
DROP POLICY IF EXISTS org_members_select ON org_members;
DROP POLICY IF EXISTS "Enable read access for organization members" ON org_members;
DROP POLICY IF EXISTS org_members_select_authenticated ON org_members;

-- Create new policy that explicitly requires authentication
CREATE POLICY org_members_select ON org_members 
  FOR SELECT 
  USING (
    -- Must be authenticated AND be a member of the organization
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id 
      AND om.user_id = auth.uid()
    )
  );

-- =====================================
-- VERIFICATION
-- =====================================

-- Test that anonymous access is blocked (should return 0 rows)
-- Run this in Supabase SQL editor to verify:
-- SET request.jwt.claims = '{}'; -- Simulate anonymous user
-- SELECT COUNT(*) FROM organizations; -- Should return 0
-- SELECT COUNT(*) FROM org_members; -- Should return 0

COMMENT ON POLICY org_select ON organizations IS 
  'Only authenticated users who are members can view organizations';

COMMENT ON POLICY org_members_select ON org_members IS 
  'Only authenticated users who are members can view org membership';
