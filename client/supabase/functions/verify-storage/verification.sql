-- Post-upload verification function
-- Cross-checks storage metadata expectations for recently uploaded files
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
  RETURN QUERY
  WITH file_expectations AS (
    SELECT
      f.id,
      f.storage_path,
      jsonb_build_object(
        'org_id', f.org_id,
        'uploaded_by', f.uploaded_by,
        'upload_timestamp', extract(epoch FROM f.created_at),
        'verified', true
      )
      || CASE WHEN f.session_id IS NOT NULL THEN jsonb_build_object('session_id', f.session_id) ELSE '{}'::jsonb END
      || CASE WHEN s.show_id IS NOT NULL THEN jsonb_build_object('show_id', s.show_id) ELSE '{}'::jsonb END
      || CASE
          WHEN af.party_type IS NOT NULL THEN jsonb_build_object('party_type', af.party_type)
          WHEN ad.party_type IS NOT NULL THEN jsonb_build_object('party_type', ad.party_type)
          ELSE '{}'::jsonb
         END AS metadata_json,
      CASE
        WHEN f.created_at > NOW() - INTERVAL '1 hour' * hours_back THEN 'needs_storage_api_verification'
        ELSE 'verification_window_expired'
      END AS status
    FROM files f
    LEFT JOIN advancing_sessions s ON s.id = f.session_id
    LEFT JOIN advancing_fields af ON af.id = f.field_id
    LEFT JOIN advancing_documents ad ON ad.id = f.document_id
    WHERE f.created_at > NOW() - INTERVAL '1 hour' * hours_back
      AND is_org_member(f.org_id)
  )
  SELECT
    id,
    storage_path,
    metadata_json,
    status,
    true AS requires_edge_function
  FROM file_expectations;
END;
$$;

-- Scheduled cleanup function for storage orphans
CREATE OR REPLACE FUNCTION cleanup_storage_orphans()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  orphan_count int := 0;
BEGIN
  -- This is a placeholder for storage cleanup logic
  -- In production, this would:
  -- 1. List all objects in storage buckets
  -- 2. Compare with database records
  -- 3. Remove orphaned objects or create missing database records

  -- For now, just clean up database records without storage objects
  -- (This would need integration with storage API to verify existence)

  RETURN orphan_count;
END;
$$;
