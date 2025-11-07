-- =====================================================
-- ENFORCE INVITATION CONSTRAINTS
-- =====================================================
-- This migration adds proper constraints to ensure data integrity
-- for invitation tokens across both invitations and show_collaborators tables

-- =====================================
-- 1. INVITATIONS TABLE CONSTRAINTS
-- =====================================

-- Add constraint: token must not be null
ALTER TABLE invitations 
  ALTER COLUMN token SET NOT NULL;

-- Add constraint: email must not be null  
ALTER TABLE invitations 
  ALTER COLUMN email SET NOT NULL;

-- Ensure unique index on token (should already exist but let's be explicit)
DROP INDEX IF EXISTS idx_invitations_token;
CREATE UNIQUE INDEX idx_invitations_token_unique ON invitations(token);

-- Add partial index for pending invitations only (without now() since it's not immutable)
CREATE INDEX IF NOT EXISTS idx_invitations_pending 
  ON invitations(org_id, email) 
  WHERE accepted_at IS NULL;

-- =====================================
-- 2. SHOW_COLLABORATORS CONSTRAINTS  
-- =====================================

-- Note: show_collaborators table was simplified in migration 20251104231000
-- The status, invite_token, invited_by, and accepted_at columns were removed
-- Show collaborators now just track which users have access to which shows
-- The invitations table handles all invitation logic

-- Verify show_collaborators table structure is as expected
DO $$
BEGIN
  -- Just verify the table exists and has expected core columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'show_collaborators' 
    AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'show_collaborators missing expected user_id column';
  END IF;
  
  RAISE NOTICE 'show_collaborators table structure verified';
END $$;

-- =====================================
-- 3. ENSURE TOKEN UNIQUENESS
-- =====================================
-- Since show_collaborators no longer has invite_token,
-- we only need to ensure invitations.token is unique (already done above)

DO $$
BEGIN
  RAISE NOTICE 'Token uniqueness constraints applied';
END $$;

-- =====================================
-- 4. ADD SERVER-SIDE TOKEN GENERATOR
-- =====================================

-- Create a secure token generator function
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token TEXT;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  LOOP
    -- Generate a secure random token (32 bytes = 256 bits)
    new_token := encode(gen_random_bytes(32), 'base64url');
    
    -- Check if it's unique in invitations table
    IF NOT EXISTS (
      SELECT 1 FROM invitations WHERE token = new_token
    ) THEN
      RETURN new_token;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique token after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION generate_secure_token IS 'Generates a cryptographically secure unique token (256-bit) for invitations. Ensures uniqueness across the invitations table.';

GRANT EXECUTE ON FUNCTION generate_secure_token() TO authenticated;

-- =====================================
-- 5. UPDATE INVITATION CREATION FUNCTIONS
-- =====================================

-- Update the invitation acceptance function to ensure it creates org membership
-- This function should already exist, but we'll recreate it to use the token generator
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_result jsonb;
BEGIN
  -- Verify user is authenticated
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get invitation - enforce token is NOT NULL
  SELECT 
    i.id,
    i.org_id,
    i.person_id,
    i.email,
    p.user_id as existing_user_id
  INTO v_invitation
  FROM invitations i
  JOIN people p ON p.id = i.person_id
  WHERE i.token = p_token  -- This will fail if token is NULL
  AND i.token IS NOT NULL  -- Explicit check
  AND i.accepted_at IS NULL
  AND i.expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already accepted';
  END IF;
  
  -- Check if person already linked to another user
  IF v_invitation.existing_user_id IS NOT NULL AND v_invitation.existing_user_id != p_user_id THEN
    RAISE EXCEPTION 'This person is already linked to another user account';
  END IF;

  -- Link user to person record
  UPDATE people 
  SET user_id = p_user_id,
      updated_at = now()
  WHERE id = v_invitation.person_id;
  
  -- Add user to org_members if not already there
  INSERT INTO org_members (org_id, user_id, role, created_at)
  VALUES (v_invitation.org_id, p_user_id, 'viewer', now())
  ON CONFLICT (org_id, user_id) DO NOTHING;
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = now(),
      updated_at = now()
  WHERE id = v_invitation.id;
  
  v_result := jsonb_build_object(
    'success', true,
    'org_id', v_invitation.org_id,
    'person_id', v_invitation.person_id,
    'message', 'Invitation accepted successfully'
  );
  
  RETURN v_result;
END;
$$;

-- =====================================
-- 6. VERIFICATION
-- =====================================

DO $$
DECLARE
  bad_invitations INT;
BEGIN
  -- Check invitations table for NULL tokens
  SELECT COUNT(*) INTO bad_invitations
  FROM invitations
  WHERE token IS NULL;
  
  IF bad_invitations > 0 THEN
    RAISE EXCEPTION '% invitations have NULL tokens - data integrity violated', bad_invitations;
  END IF;
  
  -- Verify unique index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'invitations' 
    AND indexname = 'idx_invitations_token_unique'
  ) THEN
    RAISE EXCEPTION 'Unique index on invitations.token not found';
  END IF;
  
  RAISE NOTICE '✓ All invitation constraints verified successfully';
  RAISE NOTICE '✓ Token generation function created';
  RAISE NOTICE '✓ Unique index on invitations.token enforced';
END $$;

