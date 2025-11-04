-- Migration: Fix Infinite Recursion in org_members RLS Policy (FINAL FIX)
-- Date: 2025-11-04
-- Description: Completely removes recursion by using direct user_id check
-- Issue: The previous fix still caused recursion because it queried org_members from within org_members policy
-- Solution: Allow users to see rows where they are the user, period. No subqueries.

-- =====================================
-- FIX ORG MEMBERS POLICIES
-- =====================================

-- Drop the problematic policy
DROP POLICY IF EXISTS org_members_select ON org_members;

-- Create a SIMPLE policy that does NOT query org_members at all
-- Users can ONLY see their own membership records
CREATE POLICY org_members_select ON org_members 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- Note: This means users can only see their own memberships, not other members
-- This is actually more secure and avoids ALL recursion issues
-- If you need to see other members, query through the organizations table

-- =====================================
-- COMMENTS
-- =====================================

COMMENT ON POLICY org_members_select ON org_members IS 
  'Allows authenticated users to see ONLY their own org memberships. No recursion. To see other members, query through organizations table.';
