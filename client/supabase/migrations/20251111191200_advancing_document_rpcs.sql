-- RPC functions for advancing document management
-- Bypasses RLS issues with PostgREST transaction pooler

-- Create advancing document
DROP FUNCTION IF EXISTS create_advancing_document(uuid, text, text);

CREATE OR REPLACE FUNCTION create_advancing_document(
  p_session_id uuid,
  p_party_type text,
  p_label text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_document_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Get the session's org_id
  SELECT org_id INTO v_org_id
  FROM public.advancing_sessions
  WHERE id = p_session_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to create documents for this session';
  END IF;

  -- Insert the document
  INSERT INTO public.advancing_documents (
    org_id,
    session_id,
    party_type,
    label,
    created_by
  ) VALUES (
    v_org_id,
    p_session_id,
    p_party_type::party,
    p_label,
    v_user_id
  )
  RETURNING id INTO v_document_id;

  -- Get the created document as JSON
  SELECT row_to_json(d.*) INTO v_result
  FROM public.advancing_documents d
  WHERE d.id = v_document_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_advancing_document(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION create_advancing_document IS 
'Creates an advancing document. Bypasses RLS issues.';
