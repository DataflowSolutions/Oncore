-- Migration: Add People/Org Members Sync Constraint
-- Created: 2025-11-04
-- Purpose: Clarify and enforce the relationship between people and org_members tables
--          Rule: If a person has a user_id, they MUST be in org_members

-- =====================================
-- BACKGROUND
-- =====================================
-- Currently the relationship between people and org_members is unclear:
-- - people table: Roster of humans (crew, team) with optional user_id
-- - org_members table: Authenticated platform users
-- 
-- New rule: If person.user_id is set, that user MUST be in org_members
-- This ensures every authenticated user has proper org membership

-- =====================================
-- STEP 1: FIX EXISTING DATA
-- =====================================

-- Find people with user_id who aren't in org_members and add them
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Add missing org_members entries
  INSERT INTO org_members (org_id, user_id, role, created_at)
  SELECT DISTINCT 
    p.org_id,
    p.user_id,
    'viewer'::org_role AS role, -- Default to viewer role (explicit cast)
    NOW()
  FROM people p
  WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = p.org_id
    AND om.user_id = p.user_id
  )
  ON CONFLICT (org_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS orphan_count = ROW_COUNT;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Fixed % orphaned people records by adding them to org_members', orphan_count;
  END IF;
END $$;

-- =====================================
-- STEP 2: ADD VALIDATION TRIGGER
-- =====================================

-- Since PostgreSQL doesn't support subqueries in CHECK constraints,
-- we'll enforce this relationship with a trigger
-- The sync trigger below will also ensure this, but let's be explicit

CREATE OR REPLACE FUNCTION validate_person_user_is_org_member()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if user_id is NULL
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is an org member
  IF NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = NEW.org_id
    AND org_members.user_id = NEW.user_id
  ) THEN
    -- This will be handled by sync trigger, but let's warn
    RAISE NOTICE 'Person % assigned user_id % but user not in org_members. Sync trigger will fix.', NEW.id, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger runs BEFORE the sync trigger, mainly for validation
DROP TRIGGER IF EXISTS trigger_validate_person_user_org_member ON people;

CREATE TRIGGER trigger_validate_person_user_org_member
BEFORE INSERT OR UPDATE OF user_id ON people
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL)
EXECUTE FUNCTION validate_person_user_is_org_member();

-- =====================================
-- STEP 3: CREATE SYNC TRIGGER
-- =====================================

-- Trigger function to auto-sync when person gets a user_id
CREATE OR REPLACE FUNCTION sync_person_to_org_members()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a person is assigned a user_id (e.g., they accept an invitation)
  -- Automatically ensure they're in org_members
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
    INSERT INTO org_members (org_id, user_id, role, created_at)
    VALUES (NEW.org_id, NEW.user_id, 'viewer'::org_role, NOW())
    ON CONFLICT (org_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Auto-synced person % to org_members', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_person_to_org_members ON people;

CREATE TRIGGER trigger_sync_person_to_org_members
AFTER INSERT OR UPDATE OF user_id ON people
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL)
EXECUTE FUNCTION sync_person_to_org_members();

COMMENT ON FUNCTION sync_person_to_org_members IS 'Automatically adds person to org_members when user_id is set';

-- =====================================
-- STEP 4: CREATE REVERSE SYNC TRIGGER
-- =====================================

-- When a user is added to org_members, check if they should be linked to a person record
CREATE OR REPLACE FUNCTION link_org_member_to_person()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_person_id UUID;
BEGIN
  -- Get user's email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if there's a person record with matching email and no user_id
  SELECT id INTO v_person_id
  FROM people
  WHERE org_id = NEW.org_id
  AND email = v_email
  AND user_id IS NULL
  LIMIT 1;
  
  -- If found, link them
  IF v_person_id IS NOT NULL THEN
    UPDATE people
    SET user_id = NEW.user_id,
        updated_at = NOW()
    WHERE id = v_person_id;
    
    RAISE NOTICE 'Linked org_member % to existing person %', NEW.user_id, v_person_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_link_org_member_to_person ON org_members;

CREATE TRIGGER trigger_link_org_member_to_person
AFTER INSERT ON org_members
FOR EACH ROW
EXECUTE FUNCTION link_org_member_to_person();

COMMENT ON FUNCTION link_org_member_to_person IS 'Links new org_member to existing person record with matching email';

-- =====================================
-- STEP 5: UPDATE COMMENTS
-- =====================================

COMMENT ON TABLE people IS 'Roster of humans associated with org (crew, team). Can exist without user accounts for contact info, schedules, assignments. If user_id is set, person is an authenticated platform user.';

COMMENT ON COLUMN people.user_id IS 'Optional link to authenticated user. If set, user MUST be in org_members. Set automatically when invitation is accepted.';

COMMENT ON TABLE org_members IS 'Authenticated platform users with organization access. Users here can log in and access org data based on their role.';

-- Note: Constraint enforced via triggers rather than CHECK constraint due to PostgreSQL limitations

-- =====================================
-- STEP 6: CREATE HELPER FUNCTION
-- =====================================

-- Function to check if a person can be given platform access
CREATE OR REPLACE FUNCTION can_person_get_user_access(p_person_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person RECORD;
  v_has_capacity BOOLEAN;
BEGIN
  -- Get person details
  SELECT * INTO v_person
  FROM people
  WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_invite', false,
      'reason', 'Person not found'
    );
  END IF;
  
  -- Check if already has user access
  IF v_person.user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'can_invite', false,
      'reason', 'Person already has user access'
    );
  END IF;
  
  -- Check if email is set
  IF v_person.email IS NULL THEN
    RETURN jsonb_build_object(
      'can_invite', false,
      'reason', 'Person must have email address'
    );
  END IF;
  
  -- Check seat availability using the check_org_limits function
  v_has_capacity := check_org_limits(v_person.org_id, 'member', 1);
  
  IF NOT v_has_capacity THEN
    RETURN jsonb_build_object(
      'can_invite', false,
      'reason', 'No available seats. Please upgrade plan.'
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'can_invite', true,
    'person_id', v_person.id,
    'person_name', v_person.name,
    'email', v_person.email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION can_person_get_user_access(UUID) TO authenticated;

COMMENT ON FUNCTION can_person_get_user_access IS 'Checks if a person record can be invited to get platform access';

-- =====================================
-- STEP 7: UPDATE RLS POLICIES
-- =====================================

-- Drop old policies
DROP POLICY IF EXISTS "users_view_own_person_record" ON people;
DROP POLICY IF EXISTS "users_update_own_person_record" ON people;
DROP POLICY IF EXISTS "Org members can view people" ON people;
DROP POLICY IF EXISTS "Org editors can manage people" ON people;

-- Recreate with clearer names and logic
CREATE POLICY "People can view their own record"
ON people FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "Org members can view all people in their org"
ON people FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = people.org_id
    AND org_members.user_id = auth.uid()
  )
);

CREATE POLICY "People can update their own profile"
ON people FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org editors can manage people"
ON people FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = people.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = people.org_id
    AND org_members.user_id = auth.uid()
    AND org_members.role IN ('owner', 'admin', 'editor')
  )
);

-- =====================================
-- VERIFICATION QUERIES (COMMENTED OUT)
-- =====================================

-- Verify no orphaned people records
-- SELECT 
--   p.id,
--   p.name,
--   p.email,
--   p.user_id,
--   p.org_id,
--   om.user_id IS NOT NULL as is_org_member
-- FROM people p
-- LEFT JOIN org_members om ON om.org_id = p.org_id AND om.user_id = p.user_id
-- WHERE p.user_id IS NOT NULL
-- ORDER BY is_org_member, p.created_at DESC;

-- Check for people who could be invited
-- SELECT 
--   p.id,
--   p.name,
--   p.email,
--   p.org_id,
--   can_person_get_user_access(p.id) as invitation_check
-- FROM people p
-- WHERE p.user_id IS NULL
-- AND p.email IS NOT NULL
-- LIMIT 10;

