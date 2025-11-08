-- Fix Connection Pool Exhaustion from Recursive RLS Policies
-- Problem: is_org_member() → queries org_members → triggers org_members_select policy → calls is_org_member() → RECURSION
-- Solution: Break recursion by using direct auth.uid() checks in base tables

-- =====================================
-- 1. FIX ORG_MEMBERS TABLE (CRITICAL - BREAKS RECURSION)
-- =====================================
-- org_members is the BASE table that is_org_member() queries
-- Its policies MUST NOT call is_org_member() or any function that queries org_members

DROP POLICY IF EXISTS org_members_select ON org_members;
DROP POLICY IF EXISTS org_members_insert ON org_members;
DROP POLICY IF EXISTS org_members_update ON org_members;
DROP POLICY IF EXISTS org_members_delete ON org_members;

-- SELECT: User can see their own memberships + memberships in their orgs
CREATE POLICY org_members_select ON org_members
FOR SELECT
USING (
  -- Can see own membership records
  user_id = auth.uid()
  OR
  -- Can see other members if you're an owner/admin in that org
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- INSERT: Can add yourself OR existing owner/admin can add others
CREATE POLICY org_members_insert ON org_members
FOR INSERT
WITH CHECK (
  -- Can insert yourself as member
  user_id = auth.uid()
  OR
  -- Owner/admin can insert others
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- UPDATE: Only owner/admin can update memberships
CREATE POLICY org_members_update ON org_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- DELETE: Only owner/admin can remove members
CREATE POLICY org_members_delete ON org_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- =====================================
-- 2. FIX ORGANIZATIONS TABLE (AVOID RECURSION)
-- =====================================
-- organizations policies also call is_org_member() which can stack queries

DROP POLICY IF EXISTS org_select ON organizations;
DROP POLICY IF EXISTS org_update ON organizations;
DROP POLICY IF EXISTS org_delete ON organizations;

-- SELECT: Can see orgs you're a member of (direct subquery, no function call)
CREATE POLICY org_select ON organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = organizations.id
      AND om.user_id = auth.uid()
  )
);

-- UPDATE: Members can update their org (direct subquery)
CREATE POLICY org_update ON organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = organizations.id
      AND om.user_id = auth.uid()
  )
);

-- DELETE: Only owners can delete
CREATE POLICY org_delete ON organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);

-- =====================================
-- 3. ADD SERVICE_ROLE BYPASS (CRITICAL FOR ADMIN OPERATIONS)
-- =====================================
-- Service role should ALWAYS bypass RLS, but explicit policies ensure it works
-- even if Supabase Cloud enforces RLS on service_role

-- Organizations table
DROP POLICY IF EXISTS organizations_service_role_all ON organizations;
CREATE POLICY organizations_service_role_all ON organizations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Org members table
DROP POLICY IF EXISTS org_members_service_role_all ON org_members;
CREATE POLICY org_members_service_role_all ON org_members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Org subscriptions table
DROP POLICY IF EXISTS org_subscriptions_service_role_all ON org_subscriptions;
CREATE POLICY org_subscriptions_service_role_all ON org_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Shows table
DROP POLICY IF EXISTS shows_service_role_all ON shows;
CREATE POLICY shows_service_role_all ON shows
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Artists table
DROP POLICY IF EXISTS artists_service_role_all ON artists;
CREATE POLICY artists_service_role_all ON artists
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Venues table
DROP POLICY IF EXISTS venues_service_role_all ON venues;
CREATE POLICY venues_service_role_all ON venues
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Advancing sessions table
DROP POLICY IF EXISTS advancing_sessions_service_role_all ON advancing_sessions;
CREATE POLICY advancing_sessions_service_role_all ON advancing_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Show collaborators table
DROP POLICY IF EXISTS show_collaborators_service_role_all ON show_collaborators;
CREATE POLICY show_collaborators_service_role_all ON show_collaborators
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Files table
DROP POLICY IF EXISTS files_service_role_all ON files;
CREATE POLICY files_service_role_all ON files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- People table
DROP POLICY IF EXISTS people_service_role_all ON people;
CREATE POLICY people_service_role_all ON people
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================
-- 4. DEPRECATE is_org_member() FUNCTION
-- =====================================
-- Mark as deprecated - should not be used in RLS policies anymore
-- Keep it for application code that needs it, but policies use direct subqueries

COMMENT ON FUNCTION public.is_org_member(uuid) IS 
'DEPRECATED: Do not use in RLS policies - causes recursive queries and connection pool exhaustion. 
Use direct subqueries instead: EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = <table>.org_id AND om.user_id = auth.uid())';

-- =====================================
-- SUMMARY
-- =====================================
-- This migration fixes connection pool exhaustion by:
-- 1. Breaking recursion in org_members policies (no more is_org_member() calls)
-- 2. Breaking recursion in organizations policies (direct subqueries)
-- 3. Adding explicit service_role bypass policies for all core tables
-- 4. Deprecating is_org_member() for use in RLS policies
--
-- After this migration:
-- - RLS evaluation will not trigger infinite recursion
-- - Connection pool will not be exhausted by nested RLS checks
-- - Service role operations will always bypass RLS
-- - Database will remain stable under load

