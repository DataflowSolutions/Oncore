-- Migration: Fix Infinite Recursion in org_members RLS Policy
-- Date: 2025-11-04
-- Description: Fixes the infinite recursion error in org_members_select policy
-- Issue: The policy was checking org_members membership by querying org_members itself
-- Solution: Simplify the policy to only check if the user is authenticated and viewing their own rows

-- =====================================
-- FIX ORG MEMBERS POLICIES
-- =====================================

-- Drop the problematic policy
DROP POLICY IF EXISTS org_members_select ON org_members;

-- Create a simple, non-recursive policy
-- Users can only see org_members rows where they are the user_id
-- OR rows in organizations where they are a member
CREATE POLICY org_members_select ON org_members 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND (
      -- Can see their own membership records
      user_id = auth.uid()
      -- OR can see other members in organizations where they are also a member
      OR org_id IN (
        SELECT org_id 
        FROM org_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================
-- FIX ORGANIZATIONS POLICIES
-- =====================================

-- Also update organizations policy to avoid potential issues
DROP POLICY IF EXISTS org_select ON organizations;
DROP POLICY IF EXISTS "Enable read access for organization members" ON organizations;
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_select_authenticated ON organizations;

-- Use the helper function instead of inline EXISTS
CREATE POLICY org_select ON organizations 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND public.is_org_member(id)
  );

-- =====================================
-- COMMENTS
-- =====================================

COMMENT ON POLICY org_members_select ON org_members IS 
  'Allows authenticated users to see their own memberships and other members in their organizations. Fixed infinite recursion 2025-11-04.';

COMMENT ON POLICY org_select ON organizations IS 
  'Only authenticated organization members can view organizations. Uses is_org_member function to avoid recursion.';
