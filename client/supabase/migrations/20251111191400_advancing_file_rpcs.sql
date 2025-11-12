-- RPC to upload advancing file (creates database record, actual upload handled by client)
DROP FUNCTION IF EXISTS upload_advancing_file(uuid, text, text, integer, text);

CREATE OR REPLACE FUNCTION upload_advancing_file(
  p_document_id UUID,
  p_storage_path TEXT,
  p_original_name TEXT,
  p_size_bytes INTEGER,
  p_content_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_org_id UUID;
  v_is_member BOOLEAN;
  v_file_id UUID;
  v_show_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session info from document
  SELECT asess.id, asess.org_id, asess.show_id 
  INTO v_session_id, v_org_id, v_show_id
  FROM advancing_documents ad
  JOIN advancing_sessions asess ON asess.id = ad.session_id
  WHERE ad.id = p_document_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check if user is a member of the organization
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = v_org_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Insert file record
  INSERT INTO files (
    storage_path,
    original_name,
    size_bytes,
    content_type,
    uploaded_by,
    document_id,
    session_id,
    org_id
  ) VALUES (
    p_storage_path,
    p_original_name,
    p_size_bytes,
    p_content_type,
    v_user_id,
    p_document_id,
    v_session_id,
    v_org_id
  ) RETURNING id INTO v_file_id;

  -- Log activity
  INSERT INTO activity_log (
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    v_org_id,
    v_user_id,
    'file_uploaded',
    'advancing_document',
    p_document_id,
    json_build_object(
      'file_name', p_original_name,
      'file_id', v_file_id
    )
  );

  -- Return success with IDs for revalidation
  RETURN json_build_object(
    'success', true,
    'file_id', v_file_id,
    'session_id', v_session_id,
    'show_id', v_show_id
  );
END;
$$;

-- RPC to rename advancing file
CREATE OR REPLACE FUNCTION rename_advancing_file(
  p_file_id UUID,
  p_new_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_org_id UUID;
  v_is_member BOOLEAN;
  v_show_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session info from file
  SELECT asess.id, asess.org_id, asess.show_id
  INTO v_session_id, v_org_id, v_show_id
  FROM files f
  JOIN advancing_documents ad ON ad.id = f.document_id
  JOIN advancing_sessions asess ON asess.id = ad.session_id
  WHERE f.id = p_file_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check if user is a member of the organization
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = v_org_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Update file name
  UPDATE files
  SET original_name = p_new_name
  WHERE id = p_file_id;

  -- Return success with IDs for revalidation
  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'show_id', v_show_id
  );
END;
$$;

-- RPC to delete advancing file
CREATE OR REPLACE FUNCTION delete_advancing_file(
  p_file_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_org_id UUID;
  v_is_member BOOLEAN;
  v_show_id UUID;
  v_storage_path TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get file and session info
  SELECT f.storage_path, asess.id, asess.org_id, asess.show_id
  INTO v_storage_path, v_session_id, v_org_id, v_show_id
  FROM files f
  JOIN advancing_documents ad ON ad.id = f.document_id
  JOIN advancing_sessions asess ON asess.id = ad.session_id
  WHERE f.id = p_file_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check if user is a member of the organization
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = v_org_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Delete file record (storage deletion handled by client)
  DELETE FROM files
  WHERE id = p_file_id;

  -- Return success with storage path and IDs for cleanup/revalidation
  RETURN json_build_object(
    'success', true,
    'storage_path', v_storage_path,
    'session_id', v_session_id,
    'show_id', v_show_id
  );
END;
$$;
