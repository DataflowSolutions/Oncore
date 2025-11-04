-- Migration: Fix Anonymous Access to Organizations and Org Members
-- Date: 2025-11-04
-- Description: Blocks unauthenticated users from accessing organizations and org_members tables
-- Issue: Security test revealed anonymous users could read these tables
-- This migration drops and recreates the SELECT policies with proper authentication checks

-- =====================================
-- FIX ORGANIZATIONS POLICIES
-- =====================================

-- Drop ALL existing SELECT policies on organizations
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

-- Drop ALL existing SELECT policies on org_members
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
-- VERIFICATION QUERIES
-- =====================================

-- Test that anonymous access is blocked
-- Run these in Supabase SQL editor to verify:
-- 
-- 1. Test anonymous access (should return 0 rows):
--    SET LOCAL role TO anon;
--    SELECT COUNT(*) FROM organizations;
--    SELECT COUNT(*) FROM org_members;
--    RESET role;
--
-- 2. Test authenticated user without org membership (should return 0 rows):
--    Set a valid JWT token and query - should see no orgs they're not a member of

COMMENT ON POLICY org_select ON organizations IS 
  'Only authenticated users who are members can view organizations. Fixed 2025-11-04 to block anonymous access.';

COMMENT ON POLICY org_members_select ON org_members IS 
  'Only authenticated users who are members can view org membership. Fixed 2025-11-04 to block anonymous access.';
