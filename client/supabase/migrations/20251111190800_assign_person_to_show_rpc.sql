-- RPC function to assign a person to a show
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS assign_person_to_show(uuid, uuid, text);

CREATE OR REPLACE FUNCTION assign_person_to_show(
  p_show_id uuid,
  p_person_id uuid,
  p_duty text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Get the show's org_id
  SELECT s.org_id INTO v_org_id
  FROM public.shows s
  WHERE s.id = p_show_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Show not found';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to assign people to this show';
  END IF;

  -- Verify the person belongs to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.id = p_person_id
      AND p.org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Person not found in this organization';
  END IF;

  -- Insert or update the assignment
  INSERT INTO public.show_assignments (
    show_id,
    person_id,
    duty
  ) VALUES (
    p_show_id,
    p_person_id,
    p_duty
  )
  ON CONFLICT (show_id, person_id) 
  DO UPDATE SET duty = EXCLUDED.duty;

  -- Get the created/updated assignment as JSON
  SELECT row_to_json(sa.*) INTO v_result
  FROM public.show_assignments sa
  WHERE sa.show_id = p_show_id
    AND sa.person_id = p_person_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_person_to_show(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION assign_person_to_show IS 
'Assigns a person to a show with an optional duty. Bypasses RLS issues.';
