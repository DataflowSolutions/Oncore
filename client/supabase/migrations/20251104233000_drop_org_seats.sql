-- Migration: Drop Unused org_seats Table
-- Created: 2025-11-04
-- Purpose: Remove org_seats table as org_seat_usage VIEW provides the same functionality

-- =====================================
-- BACKGROUND
-- =====================================
-- The org_seats table was created to track seat usage but is never populated
-- The org_seat_usage VIEW calculates seat counts dynamically from actual data
-- This table is redundant and can be safely removed

-- =====================================
-- STEP 1: VERIFY TABLE IS UNUSED
-- =====================================

DO $$
DECLARE
  row_count INTEGER;
  ref_count INTEGER;
BEGIN
  -- Check if table has any data
  SELECT COUNT(*) INTO row_count FROM org_seats;
  
  IF row_count > 0 THEN
    RAISE WARNING 'org_seats table contains % rows - review before dropping', row_count;
  ELSE
    RAISE NOTICE 'org_seats table is empty - safe to drop';
  END IF;
  
  -- Check for foreign key references (shouldn't be any)
  SELECT COUNT(*) INTO ref_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public'
  AND constraint_name LIKE '%org_seats%';
  
  IF ref_count > 0 THEN
    RAISE WARNING 'Found % foreign key constraints referencing org_seats', ref_count;
  END IF;
END $$;

-- =====================================
-- STEP 2: CREATE BACKUP (JUST IN CASE)
-- =====================================

-- If table has data, backup before dropping
CREATE TABLE IF NOT EXISTS _org_seats_backup AS
SELECT * FROM org_seats;

COMMENT ON TABLE _org_seats_backup IS 'Backup of org_seats table before dropping - can be removed after verification';

-- =====================================
-- STEP 3: DROP RLS POLICIES
-- =====================================

-- Drop any RLS policies on the table
DROP POLICY IF EXISTS "org_seats_select" ON org_seats;
DROP POLICY IF EXISTS "Org members can view org seats" ON org_seats;

-- =====================================
-- STEP 4: DROP THE TABLE
-- =====================================

-- Drop the org_seats table
DROP TABLE IF EXISTS public.org_seats CASCADE;

-- =====================================
-- STEP 5: VERIFY org_seat_usage VIEW STILL EXISTS
-- =====================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'org_seat_usage'
  ) THEN
    RAISE NOTICE 'org_seat_usage VIEW exists and is functional';
  ELSE
    RAISE WARNING 'org_seat_usage VIEW not found - may need to recreate';
  END IF;
END $$;

-- =====================================
-- STEP 6: ENSURE VIEW IS OPTIMAL
-- =====================================

-- Drop and recreate the view with optimizations
DROP VIEW IF EXISTS public.org_seat_usage CASCADE;

CREATE OR REPLACE VIEW public.org_seat_usage AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  -- Members = count of users in org_members
  (SELECT COUNT(*) 
   FROM org_members m 
   WHERE m.org_id = o.id) AS members_used,
  -- Collaborators = distinct users in show_collaborators for org's shows
  (SELECT COUNT(DISTINCT sc.user_id) 
   FROM shows s 
   JOIN show_collaborators sc ON sc.show_id = s.id 
   WHERE s.org_id = o.id 
   AND sc.user_id IS NOT NULL) AS collaborators_used,
  -- Artists count
  (SELECT COUNT(*) 
   FROM artists a 
   WHERE a.org_id = o.id) AS artists_used
FROM organizations o;

COMMENT ON VIEW org_seat_usage IS 'Real-time seat usage counts for organizations. Calculates members, collaborators, and artists dynamically.';

-- Create indexes on underlying tables if they don't exist
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_shows_org_id ON shows(org_id);
CREATE INDEX IF NOT EXISTS idx_show_collaborators_show_id_user_id ON show_collaborators(show_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_org_id ON artists(org_id);

-- =====================================
-- STEP 7: UPDATE CHECK FUNCTIONS
-- =====================================

-- Update check_org_limits function if it referenced org_seats table
CREATE OR REPLACE FUNCTION check_org_limits(
  p_org_id UUID,
  p_check_type TEXT,
  p_additional_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_current INTEGER;
  v_entitlements JSONB;
BEGIN
  -- Get org entitlements
  v_entitlements := org_entitlements(p_org_id);
  
  -- Get limit for the check type
  CASE p_check_type
    WHEN 'member' THEN
      v_limit := (v_entitlements->>'max_members')::INTEGER;
      SELECT members_used INTO v_current FROM org_seat_usage WHERE org_id = p_org_id;
      
    WHEN 'collaborator' THEN
      v_limit := (v_entitlements->>'max_collaborators')::INTEGER;
      SELECT collaborators_used INTO v_current FROM org_seat_usage WHERE org_id = p_org_id;
      
    WHEN 'artist' THEN
      v_limit := (v_entitlements->>'max_artists')::INTEGER;
      SELECT artists_used INTO v_current FROM org_seat_usage WHERE org_id = p_org_id;
      
    ELSE
      RAISE EXCEPTION 'Invalid check_type: %', p_check_type;
  END CASE;
  
  -- NULL limit means unlimited
  IF v_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if adding additional count would exceed limit
  RETURN (v_current + p_additional_count) <= v_limit;
END;
$$;

COMMENT ON FUNCTION check_org_limits IS 'Check if org has capacity for additional seats. Uses org_seat_usage view for current counts.';

-- =====================================
-- STEP 8: UPDATE CHECK_AVAILABLE_SEATS
-- =====================================

-- Ensure check_available_seats uses the view, not the table
CREATE OR REPLACE FUNCTION check_available_seats(p_org_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_members INTEGER;
  v_used_members INTEGER;
  v_max_collaborators INTEGER;
  v_used_collaborators INTEGER;
  v_max_artists INTEGER;
  v_used_artists INTEGER;
  v_plan_id TEXT;
  v_entitlements JSONB;
BEGIN
  -- Verify user has permission
  IF NOT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = p_org_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied: not an org member';
  END IF;

  -- Get entitlements
  v_entitlements := org_entitlements(p_org_id);
  
  v_max_members := (v_entitlements->>'max_members')::INTEGER;
  v_max_collaborators := (v_entitlements->>'max_collaborators')::INTEGER;
  v_max_artists := (v_entitlements->>'max_artists')::INTEGER;
  
  -- Get current usage from VIEW
  SELECT 
    members_used,
    collaborators_used,
    artists_used
  INTO 
    v_used_members,
    v_used_collaborators,
    v_used_artists
  FROM org_seat_usage
  WHERE org_id = p_org_id;
  
  -- Get plan ID
  SELECT plan_id INTO v_plan_id
  FROM org_subscriptions
  WHERE org_id = p_org_id;
  
  RETURN jsonb_build_object(
    'org_id', p_org_id,
    'plan_id', v_plan_id,
    'members', jsonb_build_object(
      'max', v_max_members,
      'used', v_used_members,
      'available', CASE WHEN v_max_members IS NULL THEN NULL ELSE GREATEST(v_max_members - v_used_members, 0) END
    ),
    'collaborators', jsonb_build_object(
      'max', v_max_collaborators,
      'used', v_used_collaborators,
      'available', CASE WHEN v_max_collaborators IS NULL THEN NULL ELSE GREATEST(v_max_collaborators - v_used_collaborators, 0) END
    ),
    'artists', jsonb_build_object(
      'max', v_max_artists,
      'used', v_used_artists,
      'available', CASE WHEN v_max_artists IS NULL THEN NULL ELSE GREATEST(v_max_artists - v_used_artists, 0) END
    )
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_available_seats IS 'Get detailed seat availability for an org. Uses org_seat_usage view for real-time counts.';

-- =====================================
-- VERIFICATION QUERIES (COMMENTED OUT)
-- =====================================

-- Verify the view works
-- SELECT * FROM org_seat_usage LIMIT 5;

-- Test seat checking functions
-- SELECT check_available_seats('your-org-id-here');

-- Verify table is dropped
-- SELECT * FROM org_seats; -- Should error: relation "org_seats" does not exist

-- =====================================
-- CLEANUP (RUN AFTER VERIFICATION)
-- =====================================

-- After verifying everything works, drop the backup:
-- DROP TABLE IF EXISTS _org_seats_backup;

