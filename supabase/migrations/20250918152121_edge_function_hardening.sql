-- Edge Function Hardening and Enhanced Activity Logging
-- Implements comprehensive security improvements and audit trail expansion

-- =====================================
-- 1. STORAGE PATH UNIQUENESS CONSTRAINT
-- =====================================
-- Prevent metadata inconsistencies by ensuring unique storage paths per org
ALTER TABLE files ADD CONSTRAINT files_storage_path_unique_per_org 
  UNIQUE (org_id, storage_path);

-- =====================================
-- 2. IMPROVED VERIFICATION FUNCTIONS
-- =====================================
-- Drop existing function and recreate with different return type
DROP FUNCTION IF EXISTS verify_storage_metadata(int);

-- Enhanced verification function with clear documentation about future needs
CREATE OR REPLACE FUNCTION verify_storage_metadata(hours_back int DEFAULT 1)
RETURNS TABLE (
  file_id uuid,
  storage_path text,
  expected_metadata jsonb,
  verification_status text,
  requires_edge_function boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- NOTE: This function currently provides DB-only verification
  -- For complete metadata verification, implement an Edge Function that:
  -- 1. Calls Supabase Storage API: listObjects() and getObjectMetadata()
  -- 2. Compares actual storage metadata with database records
  -- 3. Returns discrepancies for cleanup
  
  RETURN QUERY
  SELECT 
    f.id,
    f.storage_path,
    jsonb_build_object(
      'org_id', f.org_id,
      'uploaded_by', f.uploaded_by,
      'verified', true,
      'session_id', f.session_id,
      'show_id', (SELECT show_id FROM advancing_sessions WHERE id = f.session_id),
      'verification_note', 'DB record exists - storage metadata verification requires Edge Function'
    ),
    CASE 
      WHEN f.created_at > now() - interval '1 hour' * hours_back THEN 'needs_storage_api_verification'
      ELSE 'verification_window_expired'
    END,
    true -- All records need Edge Function verification
  FROM files f
  WHERE f.created_at > now() - interval '1 hour' * hours_back
    AND is_org_member(f.org_id); -- Only return files user has access to
END;
$$;

-- DB-only cleanup function for files without proper metadata flags
CREATE OR REPLACE FUNCTION cleanup_unverified_files(hours_old int DEFAULT 24)
RETURNS TABLE (
  cleaned_file_id uuid,
  storage_path text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a DB-only cleanup that removes file records
  -- For complete cleanup (including storage objects), implement Edge Function
  
  RETURN QUERY
  WITH deleted_files AS (
    DELETE FROM files 
    WHERE created_at < now() - interval '1 hour' * hours_old
      AND (
        -- Files without proper metadata structure (legacy cleanup)
        storage_path IS NULL 
        OR original_name IS NULL
        OR uploaded_by IS NULL
      )
    RETURNING id, storage_path, 'missing_required_metadata' as reason
  )
  SELECT * FROM deleted_files;
  
  -- Log cleanup activity
  INSERT INTO activity_log (org_id, user_id, action, resource_type, details)
  SELECT DISTINCT 
    (SELECT org_id FROM organizations WHERE id IN 
      (SELECT org_id FROM files WHERE id = df.cleaned_file_id LIMIT 1)
    ),
    auth.uid(),
    'cleanup_unverified_files',
    'files',
    jsonb_build_object('hours_old', hours_old, 'cleaned_count', (SELECT COUNT(*) FROM deleted_files))
  FROM (SELECT NULL::uuid as cleaned_file_id) df -- Placeholder for consistent return
  WHERE EXISTS (SELECT 1 FROM deleted_files);
END;
$$;

-- =====================================
-- 3. COMPREHENSIVE ACTIVITY LOGGING
-- =====================================
-- Enhanced organization creation with full activity logging
CREATE OR REPLACE FUNCTION app_create_organization_with_owner(
  org_name text,
  org_slug text
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug, created_by)
  VALUES (org_name, org_slug, current_user_id)
  RETURNING id INTO org_id;

  -- Add creator as owner
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (org_id, current_user_id, 'owner');

  -- Log organization creation
  PERFORM app_log_activity(
    org_id,
    'organization_created',
    'organization',
    org_id,
    jsonb_build_object(
      'org_name', org_name,
      'org_slug', org_slug,
      'created_by', current_user_id
    )
  );

  -- Log membership creation
  PERFORM app_log_activity(
    org_id,
    'member_added',
    'organization_member',
    NULL,
    jsonb_build_object(
      'user_id', current_user_id,
      'role', 'owner',
      'action', 'auto_added_as_creator'
    )
  );

  RETURN org_id;
END;
$$;

-- Enhanced show invitation with activity logging
CREATE OR REPLACE FUNCTION app_accept_show_invite(
  invite_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record record;
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get invite details
  SELECT * INTO invite_record
  FROM show_collaborators 
  WHERE invite_token = app_accept_show_invite.invite_token
    AND status = 'invited';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  -- Update invite status
  UPDATE show_collaborators 
  SET status = 'accepted', 
      user_id = current_user_id,
      updated_at = now()
  WHERE invite_token = app_accept_show_invite.invite_token;

  -- Log invitation acceptance
  PERFORM app_log_activity(
    invite_record.org_id,
    'invite_accepted',
    'show_collaborator',
    invite_record.show_id,
    jsonb_build_object(
      'invitee_user_id', current_user_id,
      'invitee_email', invite_record.email,
      'invite_token', invite_token,
      'role', invite_record.role,
      'show_id', invite_record.show_id
    )
  );

  result := jsonb_build_object(
    'success', true,
    'show_id', invite_record.show_id,
    'role', invite_record.role,
    'org_id', invite_record.org_id
  );

  RETURN result;
END;
$$;

-- Function to create advancing session with logging
CREATE OR REPLACE FUNCTION app_create_advancing_session(
  p_show_id uuid,
  p_session_title text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql  
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
  org_id_val uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Verify user has access to the show
  IF NOT has_show_access(p_show_id, 'edit') THEN
    RAISE EXCEPTION 'Access denied to show';
  END IF;

  -- Get org_id for logging
  SELECT s.org_id INTO org_id_val 
  FROM shows s 
  WHERE s.id = p_show_id;

  -- Create the advancing session
  INSERT INTO advancing_sessions (show_id, title, expires_at, created_by)
  VALUES (p_show_id, p_session_title, p_expires_at, current_user_id)
  RETURNING id INTO session_id;

  -- Log session creation
  PERFORM app_log_activity(
    org_id_val,
    'advancing_session_created',
    'advancing_session',
    session_id,
    jsonb_build_object(
      'session_title', p_session_title,
      'expires_at', p_expires_at,
      'show_id', p_show_id,
      'created_by', current_user_id
    )
  );

  RETURN session_id;
END;
$$;

-- Function to send show invitation with logging
CREATE OR REPLACE FUNCTION app_send_show_invite(
  p_show_id uuid,
  p_email text,
  p_role text DEFAULT 'viewer'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_token text;
  org_id_val uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Verify user has access to invite to this show
  IF NOT has_show_access(p_show_id, 'edit') THEN
    RAISE EXCEPTION 'Access denied to show';
  END IF;

  -- Get org_id for logging
  SELECT s.org_id INTO org_id_val 
  FROM shows s 
  WHERE s.id = p_show_id;

  -- Generate secure invite token
  invite_token := encode(gen_random_bytes(32), 'base64url');

  -- Create or update invitation
  INSERT INTO show_collaborators (show_id, org_id, email, role, invite_token, status, invited_by)
  VALUES (p_show_id, org_id_val, p_email, p_role, invite_token, 'invited', current_user_id)
  ON CONFLICT (show_id, email) DO UPDATE SET
    invite_token = EXCLUDED.invite_token,
    status = 'invited',
    updated_at = now(),
    invited_by = current_user_id;

  -- Log invitation sent
  PERFORM app_log_activity(
    org_id_val,
    'invite_sent',
    'show_collaborator',
    p_show_id,
    jsonb_build_object(
      'invitee_email', p_email,
      'role', p_role,
      'invite_token', invite_token,
      'invited_by', current_user_id,
      'show_id', p_show_id
    )
  );

  RETURN invite_token;
END;
$$;

-- =====================================
-- 4. ADDITIONAL AUDIT IMPROVEMENTS
-- =====================================
-- Function to log organization member changes
CREATE OR REPLACE FUNCTION log_org_member_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM app_log_activity(
      NEW.org_id,
      'member_added',
      'organization_member',
      NEW.org_id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role,
        'added_by', auth.uid()
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      PERFORM app_log_activity(
        NEW.org_id,
        'member_role_changed',
        'organization_member',
        NEW.org_id,
        jsonb_build_object(
          'user_id', NEW.user_id,
          'old_role', OLD.role,
          'new_role', NEW.role,
          'changed_by', auth.uid()
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM app_log_activity(
      OLD.org_id,
      'member_removed',
      'organization_member',
      OLD.org_id,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role,
        'removed_by', auth.uid()
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for organization member changes
DROP TRIGGER IF EXISTS trigger_log_org_member_changes ON org_members;
CREATE TRIGGER trigger_log_org_member_changes
  AFTER INSERT OR UPDATE OR DELETE ON org_members
  FOR EACH ROW EXECUTE FUNCTION log_org_member_changes();

-- =====================================
-- 5. PERFORMANCE AND SECURITY INDEXES
-- =====================================
-- Additional indexes for activity log performance
CREATE INDEX IF NOT EXISTS idx_activity_log_action_resource ON activity_log(action, resource_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_verification_status ON files(created_at, storage_path) WHERE storage_path IS NOT NULL;

-- Comments for future Edge Function implementations
COMMENT ON FUNCTION verify_storage_metadata IS 'DB-only verification. Implement Edge Function for complete storage API integration.';
COMMENT ON FUNCTION cleanup_unverified_files IS 'DB-only cleanup. Implement Edge Function with storage.remove() for complete cleanup.';
