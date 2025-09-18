-- Post-upload verification function
-- Alternative to Edge Function: verifies storage metadata matches database records
CREATE OR REPLACE FUNCTION verify_storage_metadata()
RETURNS TABLE (
  file_id uuid,
  storage_path text,
  metadata_mismatch jsonb,
  action_required text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_record RECORD;
  storage_object RECORD;
  expected_metadata jsonb;
  actual_metadata jsonb;
BEGIN
  -- Check all files uploaded in the last hour for metadata consistency
  FOR file_record IN 
    SELECT f.id, f.storage_path, f.bucket_name, f.org_id, f.session_id, f.uploaded_by
    FROM files f
    WHERE f.created_at > NOW() - INTERVAL '1 hour'
  LOOP
    -- Get storage object metadata (this would need to be done via a function that calls storage API)
    -- For now, we'll return a template for what needs to be verified
    
    expected_metadata := jsonb_build_object(
      'org_id', file_record.org_id,
      'uploaded_by', file_record.uploaded_by,
      'verified', true
    );
    
    -- TODO: Implement actual storage metadata retrieval
    -- This would require calling Supabase Storage API to get object metadata
    actual_metadata := jsonb_build_object('placeholder', 'needs_storage_api_integration');
    
    -- For now, return files that need verification
    RETURN QUERY SELECT 
      file_record.id,
      file_record.storage_path,
      jsonb_build_object(
        'expected', expected_metadata,
        'actual', actual_metadata
      ),
      'verify_metadata'::text;
  END LOOP;
  
  RETURN;
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