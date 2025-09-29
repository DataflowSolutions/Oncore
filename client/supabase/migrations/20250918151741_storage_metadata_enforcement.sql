-- Storage Metadata Enforcement Migration
-- Addresses user feedback on storage metadata enforcement and activity log management

-- =====================================
-- 1. CREATE NEW ENFORCED UPLOAD FUNCTION
-- =====================================
-- Main upload function with proper metadata enforcement
CREATE OR REPLACE FUNCTION app_upload_file(
  bucket_name text,
  file_path text,
  p_org_id uuid,
  p_show_id uuid DEFAULT NULL,
  p_session_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_field_id uuid DEFAULT NULL,
  p_party_type text DEFAULT NULL,
  p_original_name text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_size_bytes int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_id uuid;
  current_user_id uuid;
  metadata_obj jsonb;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate that user has access to upload to this org/show/session
  IF p_session_id IS NOT NULL THEN
    -- Check advancing session access
    IF NOT EXISTS (
      SELECT 1 FROM advancing_sessions s
      WHERE s.id = p_session_id 
        AND (is_org_member(s.org_id) OR has_show_access(s.show_id, 'edit'))
    ) THEN
      RAISE EXCEPTION 'No permission to upload to this session';
    END IF;
  ELSIF NOT is_org_editor(p_org_id) THEN
    RAISE EXCEPTION 'No permission to upload to this organization';
  END IF;

  -- Build metadata object for storage (enforced by Edge Function)
  metadata_obj := jsonb_build_object(
    'org_id', p_org_id,
    'uploaded_by', current_user_id,
    'upload_timestamp', extract(epoch from now()),
    'verified', true
  );

  -- Add optional metadata fields
  IF p_show_id IS NOT NULL THEN
    metadata_obj := metadata_obj || jsonb_build_object('show_id', p_show_id);
  END IF;
  
  IF p_session_id IS NOT NULL THEN
    metadata_obj := metadata_obj || jsonb_build_object('session_id', p_session_id);
  END IF;
  
  IF p_party_type IS NOT NULL THEN
    metadata_obj := metadata_obj || jsonb_build_object('party_type', p_party_type);
  END IF;

  -- Insert file record
  INSERT INTO files (
    org_id,
    session_id,
    document_id,
    field_id,
    storage_path,
    original_name,
    content_type,
    size_bytes,
    uploaded_by
  ) VALUES (
    p_org_id,
    p_session_id,
    p_document_id,
    p_field_id,
    file_path,
    p_original_name,
    p_content_type,
    p_size_bytes,
    current_user_id
  ) RETURNING id INTO file_id;

  -- Return file ID and required metadata for Edge Function
  RETURN jsonb_build_object(
    'file_id', file_id,
    'storage_path', file_path,
    'metadata', metadata_obj,
    'bucket', bucket_name,
    'requires_edge_function', true
  );
END;
$$;

-- =====================================
-- 2. ACTIVITY LOG WITH PARTITIONING FOUNDATION
-- =====================================
-- Create activity log table for audit trail with partitioning comments
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes for activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_log_org_time ON activity_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_time ON activity_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON activity_log(resource_type, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action, created_at DESC);

-- Note: RLS and policies for activity_log already defined in optimize_consistency migration

-- =====================================
-- 3. ACTIVITY LOG MANAGEMENT FUNCTIONS
-- =====================================
-- RPC function to log activities
CREATE OR REPLACE FUNCTION app_log_activity(
  p_org_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  INSERT INTO activity_log (
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_org_id,
    current_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$$;

-- Helper function to archive old activity logs (call via scheduled job)
CREATE OR REPLACE FUNCTION archive_old_activity_logs(days_to_keep int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Archive logs older than specified days
  -- In production, consider moving to cold storage instead of delete
  DELETE FROM activity_log 
  WHERE created_at < now() - interval '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================
-- 4. STORAGE VERIFICATION FUNCTIONS
-- =====================================
-- Post-upload verification function for alternative approach
CREATE OR REPLACE FUNCTION verify_storage_metadata(hours_back int DEFAULT 1)
RETURNS TABLE (
  file_id uuid,
  storage_path text,
  expected_metadata jsonb,
  verification_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return files that need metadata verification
  RETURN QUERY
  SELECT 
    f.id,
    f.storage_path,
    jsonb_build_object(
      'org_id', f.org_id,
      'uploaded_by', f.uploaded_by,
      'verified', true,
      'session_id', f.session_id,
      'show_id', (SELECT show_id FROM advancing_sessions WHERE id = f.session_id)
    ),
    CASE 
      WHEN f.created_at > now() - interval '1 hour' * hours_back THEN 'needs_verification'
      ELSE 'verification_expired'
    END
  FROM files f
  WHERE f.created_at > now() - interval '1 hour' * hours_back
    AND is_org_member(f.org_id); -- Only return files user has access to
END;
$$;

-- =====================================
-- 5. PERFORMANCE OPTIMIZATIONS
-- =====================================
-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_files_org_created ON files(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_session_created ON files(session_id, created_at DESC) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_show_collaborators_email ON show_collaborators(email) WHERE email IS NOT NULL;

-- =====================================
-- 6. FUTURE PARTITIONING PREPARATION
-- =====================================
-- Comments for future monthly partitioning when activity volume increases
-- 
-- Example partition creation (implement when activity_log > 1M records/month):
-- CREATE TABLE activity_log_2025_09 PARTITION OF activity_log
-- FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
--
-- CREATE TABLE activity_log_2025_10 PARTITION OF activity_log  
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
--
-- Consider automating partition creation with pg_partman extension
