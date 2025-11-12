-- RPC function to remove a person from a show
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS remove_person_from_show(uuid, uuid);

CREATE OR REPLACE FUNCTION remove_person_from_show(
  p_show_id uuid,
  p_person_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
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
    RAISE EXCEPTION 'You do not have permission to modify this show team';
  END IF;

  -- Delete the assignment
  DELETE FROM public.show_assignments
  WHERE show_id = p_show_id
    AND person_id = p_person_id;

END;
$$;

GRANT EXECUTE ON FUNCTION remove_person_from_show(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION remove_person_from_show IS 
'Removes a person from a show. Bypasses RLS issues.';
