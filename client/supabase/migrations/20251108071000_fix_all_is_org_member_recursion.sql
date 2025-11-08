-- Fix All Policies Using is_org_member() to Avoid Infinite Recursion
-- Problem: Policies calling is_org_member() → which queries org_members → triggers org_members policies → infinite loop
-- Solution: Replace is_org_member() calls with direct subqueries using table aliases

-- =====================================
-- 1. FIX advancing_comments
-- =====================================
DROP POLICY IF EXISTS adv_comments_select ON advancing_comments;

CREATE POLICY adv_comments_select ON advancing_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = advancing_comments.org_id
      AND om.user_id = auth.uid()
  )
);

-- =====================================
-- 2. FIX advancing_documents
-- =====================================
DROP POLICY IF EXISTS adv_docs_select ON advancing_documents;

CREATE POLICY adv_docs_select ON advancing_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM advancing_sessions s
    WHERE s.id = advancing_documents.session_id
      AND (
        EXISTS (
          SELECT 1 FROM org_members om
          WHERE om.org_id = s.org_id
            AND om.user_id = auth.uid()
        )
        OR has_show_access(s.show_id, 'view')
      )
  )
);

-- =====================================
-- 3. FIX advancing_sessions
-- =====================================
DROP POLICY IF EXISTS adv_sessions_select ON advancing_sessions;

CREATE POLICY adv_sessions_select ON advancing_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = advancing_sessions.org_id
      AND om.user_id = auth.uid()
  )
  OR has_show_access(show_id, 'view')
);

-- =====================================
-- 4. FIX artists
-- =====================================
DROP POLICY IF EXISTS artists_select ON artists;

CREATE POLICY artists_select ON artists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = artists.org_id
      AND om.user_id = auth.uid()
  )
);

-- =====================================
-- 5. FIX show_assignments
-- =====================================
DROP POLICY IF EXISTS show_assignments_delete ON show_assignments;
DROP POLICY IF EXISTS show_assignments_select ON show_assignments;
DROP POLICY IF EXISTS show_assignments_update ON show_assignments;

CREATE POLICY show_assignments_select ON show_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM shows s
    WHERE s.id = show_assignments.show_id
      AND EXISTS (
        SELECT 1 FROM org_members om
        WHERE om.org_id = s.org_id
          AND om.user_id = auth.uid()
      )
  )
);

CREATE POLICY show_assignments_update ON show_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM shows s
    WHERE s.id = show_assignments.show_id
      AND EXISTS (
        SELECT 1 FROM org_members om
        WHERE om.org_id = s.org_id
          AND om.user_id = auth.uid()
      )
  )
);

CREATE POLICY show_assignments_delete ON show_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM shows s
    WHERE s.id = show_assignments.show_id
      AND EXISTS (
        SELECT 1 FROM org_members om
        WHERE om.org_id = s.org_id
          AND om.user_id = auth.uid()
      )
  )
);

-- =====================================
-- 6. FIX shows
-- =====================================
DROP POLICY IF EXISTS shows_select ON shows;

CREATE POLICY shows_select ON shows
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = shows.org_id
      AND om.user_id = auth.uid()
  )
  OR has_show_access(id, 'view')
);

-- =====================================
-- 7. FIX venues
-- =====================================
DROP POLICY IF EXISTS venues_select ON venues;

CREATE POLICY venues_select ON venues
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = venues.org_id
      AND om.user_id = auth.uid()
  )
);

-- =====================================
-- SUMMARY
-- =====================================
-- This migration eliminates ALL uses of is_org_member() in RLS policies.
-- All policies now use direct subqueries with table aliases to prevent recursion.
-- 
-- Tables fixed:
-- - advancing_comments (1 policy)
-- - advancing_documents (1 policy)
-- - advancing_sessions (1 policy)
-- - artists (1 policy)
-- - show_assignments (3 policies)
-- - shows (1 policy)
-- - venues (1 policy)
-- Total: 9 policies rewritten
