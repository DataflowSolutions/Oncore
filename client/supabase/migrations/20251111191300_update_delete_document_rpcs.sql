-- RPC to update advancing document label
DROP FUNCTION IF EXISTS update_advancing_document(uuid, text);

CREATE OR REPLACE FUNCTION update_advancing_document(
  p_document_id UUID,
  p_label TEXT
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
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session_id and org_id from document
  SELECT ad.session_id, asess.org_id INTO v_session_id, v_org_id
  FROM advancing_documents ad
  JOIN advancing_sessions asess ON asess.id = ad.session_id
  WHERE ad.id = p_document_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  -- Check if user is a member of the organization
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = v_org_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Update the document
  UPDATE advancing_documents
  SET label = p_label
  WHERE id = p_document_id;

  -- Return success with session_id for revalidation
  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id
  );
END;
$$;

-- RPC to delete advancing document
DROP FUNCTION IF EXISTS delete_advancing_document(uuid);

CREATE OR REPLACE FUNCTION delete_advancing_document(
  p_document_id UUID
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
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session_id and org_id from document
  SELECT ad.session_id, asess.org_id INTO v_session_id, v_org_id
  FROM advancing_documents ad
  JOIN advancing_sessions asess ON asess.id = ad.session_id
  WHERE ad.id = p_document_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  -- Check if user is a member of the organization
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = v_org_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Delete the document (cascades to files via ON DELETE CASCADE)
  DELETE FROM advancing_documents
  WHERE id = p_document_id;

  -- Return success with session_id for revalidation
  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id
  );
END;
$$;
