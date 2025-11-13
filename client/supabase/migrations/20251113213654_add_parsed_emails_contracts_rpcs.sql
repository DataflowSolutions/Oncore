-- RPCs for parsed_emails and parsed_contracts to bypass RLS issues with transaction pooler

-- =====================================
-- GET PARSED EMAILS
-- =====================================

CREATE OR REPLACE FUNCTION get_parsed_emails(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  subject TEXT,
  from_email TEXT,
  raw_content TEXT,
  parsed_data JSONB,
  status TEXT,
  confidence NUMERIC(5,2),
  error TEXT,
  show_id UUID,
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify access through org_members (using another table would be circular)
  -- We'll trust the RPC itself since it's SECURITY DEFINER with owner postgres
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Return parsed emails
  RETURN QUERY
  SELECT 
    pe.id,
    pe.org_id,
    pe.subject,
    pe.from_email,
    pe.raw_content,
    pe.parsed_data,
    pe.status,
    pe.confidence,
    pe.error,
    pe.show_id,
    pe.created_by,
    pe.reviewed_by,
    pe.reviewed_at,
    pe.created_at,
    pe.updated_at
  FROM public.parsed_emails pe
  WHERE pe.org_id = p_org_id
  ORDER BY pe.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_parsed_emails(UUID) TO authenticated;
ALTER FUNCTION get_parsed_emails(UUID) OWNER TO postgres;

COMMENT ON FUNCTION get_parsed_emails IS 'Get parsed emails for an organization. Owned by postgres to bypass RLS.';

-- =====================================
-- GET PARSED CONTRACTS
-- =====================================

CREATE OR REPLACE FUNCTION get_parsed_contracts(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  file_name TEXT,
  file_url TEXT,
  parsed_data JSONB,
  status TEXT,
  confidence NUMERIC(5,2),
  notes TEXT,
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Return parsed contracts
  RETURN QUERY
  SELECT 
    pc.id,
    pc.org_id,
    pc.file_name,
    pc.file_url,
    pc.parsed_data,
    pc.status,
    pc.confidence,
    pc.notes,
    pc.created_by,
    pc.reviewed_by,
    pc.reviewed_at,
    pc.error,
    pc.created_at,
    pc.updated_at
  FROM public.parsed_contracts pc
  WHERE pc.org_id = p_org_id
  ORDER BY pc.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_parsed_contracts(UUID) TO authenticated;
ALTER FUNCTION get_parsed_contracts(UUID) OWNER TO postgres;

COMMENT ON FUNCTION get_parsed_contracts IS 'Get parsed contracts for an organization. Owned by postgres to bypass RLS.';
