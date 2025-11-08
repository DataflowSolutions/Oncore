-- Fix storage policies to work with actual file paths instead of metadata
-- Storage RLS policies need to check the file path structure, not metadata

-- Drop old advancing-files policies
DROP POLICY IF EXISTS adv_files_read ON storage.objects;
DROP POLICY IF EXISTS adv_files_write ON storage.objects;
DROP POLICY IF EXISTS adv_files_update ON storage.objects;
DROP POLICY IF EXISTS adv_files_delete ON storage.objects;

-- Create new advancing-files policies that check path structure
-- Path structure: {org_id}/shows/{show_id}/advancing/{session_id}/{filename}

CREATE POLICY "Allow authenticated users to upload advancing files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'advancing-files'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated users to read advancing files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'advancing-files'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated users to update advancing files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'advancing-files'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated users to delete advancing files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'advancing-files'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
  )
);
