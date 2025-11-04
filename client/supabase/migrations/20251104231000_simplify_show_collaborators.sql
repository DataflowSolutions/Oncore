-- Migration: Simplify Show Collaborators Invitation System
-- Created: 2025-11-04
-- Purpose: Remove duplicate invitation logic from show_collaborators
--          Use invitations table as single source of truth for all invitations

-- =====================================
-- BACKGROUND
-- =====================================
-- Currently show_collaborators has its own invitation fields (invite_token, status, etc.)
-- This duplicates the invitations table functionality
-- New flow: 
--   1. Invite user to org via invitations table
--   2. User accepts, gets added to org_members and people
--   3. Grant show access via show_collaborators (simple access control)

-- =====================================
-- STEP 1: VERIFY CURRENT STATE
-- =====================================

-- Check if there are any pending show_collaborator invites
-- These would need to be migrated to the invitations table first
DO $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM show_collaborators
  WHERE status = 'invited' AND accepted_at IS NULL;
  
  IF pending_count > 0 THEN
    RAISE NOTICE 'Warning: % pending show collaborator invitations found', pending_count;
    RAISE NOTICE 'These invitations will be preserved but should be handled via the invitations table going forward';
  END IF;
END $$;

-- =====================================
-- STEP 2: BACKUP EXISTING INVITE DATA
-- =====================================

-- Create a temporary table to store invite information for rollback if needed
CREATE TABLE IF NOT EXISTS _show_collaborators_invite_backup AS
SELECT 
  id,
  show_id,
  user_id,
  email,
  invite_token,
  invited_by,
  accepted_at,
  status,
  created_at
FROM show_collaborators
WHERE invite_token IS NOT NULL OR status IN ('invited', 'revoked');

COMMENT ON TABLE _show_collaborators_invite_backup IS 'Backup of show_collaborators invite data before migration - can be dropped after verification';

-- =====================================
-- STEP 3: UPDATE EXISTING RECORDS
-- =====================================

-- For invited collaborators who haven't accepted yet:
-- Keep them in the table but note that future invites should go through invitations table
UPDATE show_collaborators
SET status = 'invited'  -- Keep existing invited status
WHERE status = 'invited' AND accepted_at IS NULL;

-- For accepted collaborators, ensure they're in org_members
-- (This should already be enforced but let's be safe)
DO $$
DECLARE
  collab RECORD;
BEGIN
  FOR collab IN 
    SELECT DISTINCT sc.user_id, s.org_id
    FROM show_collaborators sc
    JOIN shows s ON s.id = sc.show_id
    WHERE sc.user_id IS NOT NULL
      AND sc.accepted_at IS NOT NULL
  LOOP
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (collab.org_id, collab.user_id, 'viewer')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- =====================================
-- STEP 4: ADD NEW CONSTRAINT VIA TRIGGER
-- =====================================

-- Since PostgreSQL doesn't support subqueries in CHECK constraints,
-- we'll enforce this with a trigger instead

CREATE OR REPLACE FUNCTION validate_show_collaborator_is_org_member()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if user_id is NULL (not yet assigned)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is an org member for this show's org
  IF NOT EXISTS (
    SELECT 1 
    FROM org_members om
    JOIN shows s ON s.org_id = om.org_id
    WHERE om.user_id = NEW.user_id
    AND s.id = NEW.show_id
  ) THEN
    RAISE EXCEPTION 'User must be an organization member before being added as show collaborator';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate on insert/update
DROP TRIGGER IF EXISTS trigger_validate_show_collaborator_org_member ON show_collaborators;

CREATE TRIGGER trigger_validate_show_collaborator_org_member
BEFORE INSERT OR UPDATE OF user_id ON show_collaborators
FOR EACH ROW
EXECUTE FUNCTION validate_show_collaborator_is_org_member();

COMMENT ON FUNCTION validate_show_collaborator_is_org_member IS 'Ensures show collaborators are org members before being added';

-- =====================================
-- STEP 5: REMOVE INVITATION COLUMNS
-- =====================================

-- Note: We're keeping email, user_id, and created_at as they're still needed
-- Only removing the duplicate invitation mechanism fields

-- Remove invite_token column (use invitations.token instead)
ALTER TABLE show_collaborators 
  DROP COLUMN IF EXISTS invite_token;

-- Remove invited_by column (use invitations.created_by instead)
ALTER TABLE show_collaborators 
  DROP COLUMN IF EXISTS invited_by;

-- Remove accepted_at column (use invitations.accepted_at instead)
ALTER TABLE show_collaborators 
  DROP COLUMN IF EXISTS accepted_at;

-- Remove status column (invitation status tracked in invitations table)
ALTER TABLE show_collaborators 
  DROP COLUMN IF EXISTS status;

-- =====================================
-- STEP 6: ADD UPDATED_AT COLUMN
-- =====================================

-- Add updated_at for better tracking
ALTER TABLE show_collaborators 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================
-- STEP 7: UPDATE RLS POLICIES
-- =====================================

-- Drop old policies that referenced status column
DROP POLICY IF EXISTS "Collaborators can view their show invites" ON show_collaborators;
DROP POLICY IF EXISTS "Org members can view show collaborators" ON show_collaborators;
DROP POLICY IF EXISTS "Org editors can manage show collaborators" ON show_collaborators;

-- Create simplified policies
-- 1. Show collaborators can view shows they're assigned to
CREATE POLICY "Collaborators can view their assigned shows"
ON show_collaborators FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- 2. Org members can view all collaborators for their org's shows
CREATE POLICY "Org members can view show collaborators"
ON show_collaborators FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM shows s
    JOIN org_members om ON om.org_id = s.org_id
    WHERE s.id = show_collaborators.show_id
    AND om.user_id = auth.uid()
  )
);

-- 3. Org editors can manage show collaborators
CREATE POLICY "Org editors can manage show collaborators"
ON show_collaborators FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM shows s
    JOIN org_members om ON om.org_id = s.org_id
    WHERE s.id = show_collaborators.show_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM shows s
    JOIN org_members om ON om.org_id = s.org_id
    WHERE s.id = show_collaborators.show_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'editor')
  )
);

-- =====================================
-- STEP 8: UPDATE FUNCTIONS
-- =====================================

-- Drop old invite function that used show_collaborators invitation system
DROP FUNCTION IF EXISTS app_invite_collaborator(uuid, citext, show_collab_role);
DROP FUNCTION IF EXISTS app_invite_collaborator_enhanced(uuid, citext, show_collab_role);
DROP FUNCTION IF EXISTS app_send_show_invite(uuid, text, text);
DROP FUNCTION IF EXISTS app_accept_show_invite(text);
DROP FUNCTION IF EXISTS app_accept_show_invite(text, uuid);

-- Create new simplified function for adding show collaborators
-- (Assumes user is already an org member via invitations flow)
CREATE OR REPLACE FUNCTION app_add_show_collaborator(
  p_show_id UUID,
  p_user_id UUID,
  p_role show_collab_role DEFAULT 'promoter_viewer'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_email TEXT;
  v_collab_id UUID;
BEGIN
  -- Get show's org_id
  SELECT org_id INTO v_org_id 
  FROM shows 
  WHERE id = p_show_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Show not found';
  END IF;
  
  -- Verify caller has permission
  IF NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = v_org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'editor')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Verify target user is an org member
  IF NOT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = v_org_id
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User must be invited to organization first';
  END IF;
  
  -- Get user email for the record
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Add collaborator
  INSERT INTO show_collaborators (show_id, user_id, email, role, org_id, created_at)
  VALUES (p_show_id, p_user_id, v_email, p_role, v_org_id, NOW())
  ON CONFLICT (show_id, email) 
  DO UPDATE SET 
    user_id = p_user_id,
    role = p_role,
    updated_at = NOW()
  RETURNING id INTO v_collab_id;
  
  -- Log activity
  PERFORM app_log_activity(
    v_org_id,
    'show_collaborator_added',
    'show_collaborator',
    v_collab_id,
    jsonb_build_object(
      'show_id', p_show_id,
      'user_id', p_user_id,
      'email', v_email,
      'role', p_role
    )
  );
  
  RETURN v_collab_id;
END;
$$;

GRANT EXECUTE ON FUNCTION app_add_show_collaborator(UUID, UUID, show_collab_role) TO authenticated;

COMMENT ON FUNCTION app_add_show_collaborator IS 'Add a user as a show collaborator. User must already be an org member (via invitations system).';

-- =====================================
-- STEP 9: CREATE TRIGGER FOR UPDATED_AT
-- =====================================

CREATE OR REPLACE FUNCTION update_show_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER show_collaborators_updated_at
BEFORE UPDATE ON show_collaborators
FOR EACH ROW
EXECUTE FUNCTION update_show_collaborators_updated_at();

-- =====================================
-- STEP 10: UPDATE COMMENTS
-- =====================================

COMMENT ON TABLE show_collaborators IS 'Show-level access control. Users must be org members first (via invitations), then granted show access.';
COMMENT ON COLUMN show_collaborators.user_id IS 'User ID (required). User must be in org_members for the shows organization.';
COMMENT ON COLUMN show_collaborators.email IS 'User email (for display/lookup purposes)';
COMMENT ON COLUMN show_collaborators.role IS 'Show-level role: promoter_editor or promoter_viewer';

-- =====================================
-- VERIFICATION QUERIES (COMMENTED OUT)
-- =====================================

-- Verify all show collaborators are org members
-- SELECT 
--   sc.id,
--   sc.show_id,
--   sc.user_id,
--   sc.email,
--   s.org_id,
--   om.user_id IS NOT NULL as is_org_member
-- FROM show_collaborators sc
-- JOIN shows s ON s.id = sc.show_id
-- LEFT JOIN org_members om ON om.org_id = s.org_id AND om.user_id = sc.user_id
-- WHERE sc.user_id IS NOT NULL
-- ORDER BY is_org_member, sc.created_at DESC;

-- =====================================
-- CLEANUP (RUN AFTER VERIFICATION)
-- =====================================

-- After verifying the migration worked, drop the backup table:
-- DROP TABLE IF EXISTS _show_collaborators_invite_backup;

