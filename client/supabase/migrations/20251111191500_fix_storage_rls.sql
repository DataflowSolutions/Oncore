-- Create SECURITY DEFINER function to check storage permissions
-- This fixes RLS issues with transaction pooler for storage operations

CREATE OR REPLACE FUNCTION check_storage_org_access(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is a member of the organization
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = v_user_id
  ) INTO v_is_member;

  RETURN v_is_member;
END;
$$;

-- Drop old advancing-files policies
DROP POLICY IF EXISTS "Allow authenticated users to upload advancing files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read advancing files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update advancing files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete advancing files" ON storage.objects;

-- Create new storage policies using SECURITY DEFINER function
CREATE POLICY "Allow authenticated users to upload advancing files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'advancing-files'
  AND check_storage_org_access((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Allow authenticated users to read advancing files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'advancing-files'
  AND check_storage_org_access((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Allow authenticated users to update advancing files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'advancing-files'
  AND check_storage_org_access((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Allow authenticated users to delete advancing files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'advancing-files'
  AND check_storage_org_access((storage.foldername(name))[1]::uuid)
);
