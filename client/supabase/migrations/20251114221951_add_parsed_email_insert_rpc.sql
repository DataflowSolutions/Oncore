-- Add RPC to insert parsed emails bypassing RLS
-- Created: 2025-11-14

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.insert_parsed_email(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, UUID, TEXT);
DROP FUNCTION IF EXISTS public.update_parsed_email_status(UUID, UUID, TEXT, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.update_parsed_email_status(UUID, UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_parsed_email_by_id(UUID);

-- Function to insert parsed email (bypasses RLS checks on org_members)
CREATE OR REPLACE FUNCTION public.insert_parsed_email(
  p_org_id UUID,
  p_subject TEXT,
  p_from_email TEXT,
  p_raw_content TEXT,
  p_parsed_data JSONB,
  p_status TEXT,
  p_confidence NUMERIC,
  p_created_by UUID,
  p_error TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_email_id UUID;
BEGIN
  -- Insert the parsed email
  INSERT INTO parsed_emails (
    org_id,
    subject,
    from_email,
    raw_content,
    parsed_data,
    status,
    confidence,
    created_by,
    error
  ) VALUES (
    p_org_id,
    p_subject,
    p_from_email,
    p_raw_content,
    p_parsed_data,
    p_status,
    p_confidence,
    p_created_by,
    p_error
  )
  RETURNING id INTO v_email_id;

  RETURN v_email_id;
END;
$$;

-- Set owner to postgres to bypass RLS
ALTER FUNCTION public.insert_parsed_email(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, UUID, TEXT) OWNER TO postgres;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_parsed_email(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.insert_parsed_email IS 'Inserts a parsed email record, bypassing RLS checks on org_members table';

-- Function to update parsed email status (bypasses RLS checks on org_members)
CREATE OR REPLACE FUNCTION public.update_parsed_email_status(
  p_email_id UUID,
  p_org_id UUID,
  p_status TEXT,
  p_reviewed_by UUID,
  p_error TEXT DEFAULT NULL,
  p_show_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the parsed email status
  UPDATE parsed_emails
  SET
    status = p_status,
    reviewed_at = now(),
    reviewed_by = p_reviewed_by,
    error = p_error,
    show_id = COALESCE(p_show_id, show_id)
  WHERE id = p_email_id
    AND org_id = p_org_id;

  RETURN FOUND;
END;
$$;

-- Set owner to postgres to bypass RLS
ALTER FUNCTION public.update_parsed_email_status(UUID, UUID, TEXT, UUID, TEXT, UUID) OWNER TO postgres;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_parsed_email_status(UUID, UUID, TEXT, UUID, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.update_parsed_email_status IS 'Updates parsed email status, bypassing RLS checks on org_members table';

-- Function to get parsed email by ID (bypasses RLS checks on org_members)
CREATE OR REPLACE FUNCTION public.get_parsed_email_by_id(
  p_email_id UUID
)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  subject TEXT,
  from_email TEXT,
  raw_content TEXT,
  parsed_data JSONB,
  status TEXT,
  confidence NUMERIC,
  error TEXT,
  show_id UUID,
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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
  FROM parsed_emails pe
  WHERE pe.id = p_email_id;
END;
$$;

-- Set owner to postgres to bypass RLS
ALTER FUNCTION public.get_parsed_email_by_id(UUID) OWNER TO postgres;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_parsed_email_by_id(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_parsed_email_by_id IS 'Gets a parsed email by ID, bypassing RLS checks on org_members table';
