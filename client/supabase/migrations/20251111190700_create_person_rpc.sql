-- RPC function to create a person in an organization
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS create_person(uuid, text, text, text, text, text, member_type);

CREATE OR REPLACE FUNCTION create_person(
  p_org_id uuid,
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_role_title text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_member_type member_type DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_person_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to add people to this organization';
  END IF;

  -- Insert the person
  INSERT INTO public.people (
    org_id,
    name,
    email,
    phone,
    role_title,
    notes,
    member_type
  ) VALUES (
    p_org_id,
    p_name,
    p_email,
    p_phone,
    p_role_title,
    p_notes,
    p_member_type
  )
  RETURNING id INTO v_person_id;

  -- Get the created person as JSON
  SELECT row_to_json(p.*) INTO v_result
  FROM public.people p
  WHERE p.id = v_person_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_person(uuid, text, text, text, text, text, member_type) TO authenticated;

COMMENT ON FUNCTION create_person IS 
'Creates a new person in an organization. Bypasses RLS issues.';
