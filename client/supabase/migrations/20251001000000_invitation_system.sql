-- =====================================================
-- INVITATION SYSTEM
-- Remove access code system and implement proper invitations
-- =====================================================

-- =====================================================
-- 1. Clean Up Old Invitation Systems
-- =====================================================

-- Remove unused invited_email column from org_members
-- (show_collaborators invitation system is separate and will remain)
ALTER TABLE org_members DROP COLUMN IF EXISTS invited_email;

-- Drop access code related functions
DROP FUNCTION IF EXISTS verify_access_code(text);
DROP FUNCTION IF EXISTS generate_access_code();

-- Remove access code column from advancing_sessions
ALTER TABLE advancing_sessions DROP COLUMN IF EXISTS access_code_hash;

-- =====================================================
-- 2. Create Invitations Table
-- =====================================================

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  person_id uuid REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT invitations_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT invitations_token_length CHECK (length(token) >= 32),
  CONSTRAINT invitations_expires_future CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_person_id ON invitations(person_id);
CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE accepted_at IS NULL;

-- =====================================================
-- 3. RLS Policies for Invitations
-- =====================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org editors can view all invitations for their org
CREATE POLICY "org_editors_view_invitations"
ON invitations FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
  )
);

-- Org editors can create invitations
CREATE POLICY "org_editors_create_invitations"
ON invitations FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
  )
);

-- Org editors can update invitations (resend, cancel)
CREATE POLICY "org_editors_update_invitations"
ON invitations FOR UPDATE
USING (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
  )
);

-- Org editors can delete invitations
CREATE POLICY "org_editors_delete_invitations"
ON invitations FOR DELETE
USING (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
  )
);

-- =====================================================
-- 4. RPC Function: Check Available Seats
-- =====================================================

CREATE OR REPLACE FUNCTION check_available_seats(p_org_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_seats int;
  v_used_seats int;
  v_available_seats int;
  v_plan_id text;
BEGIN
  -- Verify user has permission (must be org member)
  IF NOT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = p_org_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied: not an org member';
  END IF;

  -- Get max seats from subscription plan (using max_members column)
  SELECT os.plan_id, bp.max_members 
  INTO v_plan_id, v_max_seats
  FROM org_subscriptions os
  JOIN billing_plans bp ON bp.id = os.plan_id
  WHERE os.org_id = p_org_id
  AND os.status IN ('active', 'trialing');
  
  IF v_max_seats IS NULL THEN
    RAISE EXCEPTION 'No active subscription found';
  END IF;

  -- Count active members (people with user accounts)
  SELECT COUNT(*) INTO v_used_seats
  FROM people
  WHERE org_id = p_org_id
    AND user_id IS NOT NULL;
  
  v_available_seats := v_max_seats - v_used_seats;
  
  RETURN jsonb_build_object(
    'org_id', p_org_id,
    'plan_id', v_plan_id,
    'max_seats', v_max_seats,
    'used_seats', v_used_seats,
    'available_seats', GREATEST(v_available_seats, 0),
    'can_invite', v_available_seats > 0
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_available_seats(uuid) TO authenticated;

-- =====================================================
-- 5. RPC Function: Get Invitation by Token (Public)
-- =====================================================

CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_result jsonb;
BEGIN
  -- Get invitation with org and person details
  SELECT 
    i.id,
    i.org_id,
    i.person_id,
    i.email,
    i.expires_at,
    i.accepted_at,
    i.created_at,
    o.name as org_name,
    o.slug as org_slug,
    p.name as person_name,
    p.role_title,
    p.member_type
  INTO v_invitation
  FROM invitations i
  JOIN organizations o ON o.id = i.org_id
  JOIN people p ON p.id = i.person_id
  WHERE i.token = p_token
  AND i.accepted_at IS NULL
  AND i.expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already accepted';
  END IF;
  
  v_result := jsonb_build_object(
    'id', v_invitation.id,
    'org_id', v_invitation.org_id,
    'org_name', v_invitation.org_name,
    'org_slug', v_invitation.org_slug,
    'person_id', v_invitation.person_id,
    'person_name', v_invitation.person_name,
    'role_title', v_invitation.role_title,
    'member_type', v_invitation.member_type,
    'email', v_invitation.email,
    'expires_at', v_invitation.expires_at,
    'created_at', v_invitation.created_at
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- This function is public (no GRANT needed, accessible via anon role)
GRANT EXECUTE ON FUNCTION get_invitation_by_token(text) TO anon, authenticated;

-- =====================================================
-- 6. RPC Function: Accept Invitation
-- =====================================================

CREATE OR REPLACE FUNCTION accept_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS jsonb
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

  -- Get invitation
  SELECT 
    i.id,
    i.org_id,
    i.person_id,
    i.email,
    p.user_id as existing_user_id
  INTO v_invitation
  FROM invitations i
  JOIN people p ON p.id = i.person_id
  WHERE i.token = p_token
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
  VALUES (v_invitation.org_id, p_user_id, 'member', now())
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
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION accept_invitation(text, uuid) TO authenticated;

-- =====================================================
-- 7. Update RLS Policies for Invited Users
-- =====================================================

-- Allow people to view their own person record
CREATE POLICY "users_view_own_person_record"
ON people FOR SELECT
USING (
  user_id = auth.uid()
  OR
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow people to update their own person record (profile info)
CREATE POLICY "users_update_own_person_record"
ON people FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 8. Activity Log for Invitations
-- =====================================================

-- Log invitation creation
CREATE OR REPLACE FUNCTION log_invitation_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (
      org_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      NEW.org_id,
      NEW.created_by,
      'invitation.created',
      'invitation',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'person_id', NEW.person_id,
        'expires_at', NEW.expires_at
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    INSERT INTO activity_log (
      org_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      NEW.org_id,
      auth.uid(),
      'invitation.accepted',
      'invitation',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'person_id', NEW.person_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_invitation_activity
AFTER INSERT OR UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION log_invitation_activity();

-- =====================================================
-- Comments
-- =====================================================
-- Invitation system replaces access code system
-- Users must have accounts to view any data
-- "Ghost accounts" (people without users) can be invited
-- Invitations check seat limits based on billing plan
-- Invitations expire after 7 days by default
-- Activity logging tracks all invitation actions
-- =====================================================
