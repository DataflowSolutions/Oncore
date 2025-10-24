-- =====================================================
-- ADD ROLE FIELD TO INVITATIONS
-- Allow invitations to specify the role the invitee will receive
-- =====================================================

-- Add role column to invitations table
ALTER TABLE invitations 
ADD COLUMN role org_role NOT NULL DEFAULT 'viewer';

-- Create index for role-based queries
CREATE INDEX idx_invitations_role ON invitations(role);

-- =====================================================
-- Update accept_invitation function to use the role
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
    i.role,
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
  
  -- Add user to org_members with the invited role
  INSERT INTO org_members (org_id, user_id, role, created_at)
  VALUES (v_invitation.org_id, p_user_id, v_invitation.role, now())
  ON CONFLICT (org_id, user_id) 
  DO UPDATE SET role = EXCLUDED.role, created_at = now();
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = now(),
      updated_at = now()
  WHERE id = v_invitation.id;
  
  v_result := jsonb_build_object(
    'success', true,
    'org_id', v_invitation.org_id,
    'person_id', v_invitation.person_id,
    'role', v_invitation.role,
    'message', 'Invitation accepted successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Update get_invitation_by_token to include role
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
    i.role,
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
    'role', v_invitation.role,
    'role_title', v_invitation.role_title,
    'member_type', v_invitation.member_type,
    'email', v_invitation.email,
    'expires_at', v_invitation.expires_at,
    'created_at', v_invitation.created_at
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Update activity log to include role information
-- =====================================================

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
        'role', NEW.role,
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
        'person_id', NEW.person_id,
        'role', NEW.role
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments
-- =====================================================
-- Now invitations can specify which org_role the invitee will receive:
--   - 'owner': Full control (use carefully!)
--   - 'admin': Administrative access
--   - 'editor': Can create and edit content
--   - 'viewer': Read-only access
-- 
-- Default role is 'viewer' for security
-- Role is applied when invitation is accepted
-- =====================================================
