-- RPC function to save advancing grid data
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS save_advancing_grid_data(uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS save_advancing_grid_data(uuid, uuid, text, jsonb, text);

CREATE OR REPLACE FUNCTION save_advancing_grid_data(
  p_org_id uuid,
  p_session_id uuid,
  p_grid_type text,
  p_grid_data jsonb,
  p_party_type text DEFAULT 'from_you'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_session_org_id uuid;
  v_row jsonb;
  v_column_key text;
  v_column_value text;
  v_person_id text;
  v_field_name text;
  v_section text;
  v_existing_field_id uuid;
  v_inserted_count int := 0;
  v_updated_count int := 0;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  RAISE NOTICE 'save_advancing_grid_data called: org_id=%, session_id=%, grid_type=%, party_type=%, user_id=%', 
    p_org_id, p_session_id, p_grid_type, p_party_type, v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- First, verify session exists and get org_id
  -- This query should bypass RLS in SECURITY DEFINER context
  BEGIN
    SELECT org_id INTO STRICT v_session_org_id
    FROM public.advancing_sessions
    WHERE id = p_session_id;
    
    RAISE NOTICE 'Found session with org_id=%', v_session_org_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE NOTICE 'Session not found in database: %', p_session_id;
      RAISE EXCEPTION 'Session not found: %', p_session_id;
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Multiple sessions found for ID: %', p_session_id;
  END;

  -- Verify session belongs to the requested org
  IF v_session_org_id != p_org_id THEN
    RAISE EXCEPTION 'Session does not belong to this organization';
  END IF;

  -- Verify user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Not a member of this organization';
  END IF;

  -- Calculate section name from grid type
  v_section := initcap(replace(p_grid_type, '_', ' '));

  -- Process each row in the grid data
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_grid_data)
  LOOP
    -- Extract person ID from row.id
    v_person_id := regexp_replace(v_row->>'id', '^' || p_grid_type || '_', '');
    
    -- Process each column in the row (except 'id')
    FOR v_column_key, v_column_value IN 
      SELECT key, value::text 
      FROM jsonb_each_text(v_row) 
      WHERE key != 'id' AND value IS NOT NULL AND value != ''
    LOOP
      -- Build field name
      v_field_name := p_grid_type || '_' || v_person_id || '_' || v_column_key;
      
      -- Check if field already exists
      SELECT id INTO v_existing_field_id
      FROM public.advancing_fields
      WHERE session_id = p_session_id
        AND field_name = v_field_name;
      
      IF v_existing_field_id IS NOT NULL THEN
        -- Update existing field
        UPDATE public.advancing_fields
        SET value = to_jsonb(v_column_value)
        WHERE id = v_existing_field_id;
        
        v_updated_count := v_updated_count + 1;
      ELSE
        -- Insert new field
        INSERT INTO public.advancing_fields (
          org_id,
          session_id,
          section,
          field_name,
          field_type,
          value,
          party_type,
          sort_order,
          created_by
        ) VALUES (
          p_org_id,
          p_session_id,
          v_section,
          v_field_name,
          'text',
          to_jsonb(v_column_value),
          p_party_type::party,
          1000,
          v_user_id
        );
        
        v_inserted_count := v_inserted_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'inserted', v_inserted_count,
    'updated', v_updated_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION save_advancing_grid_data(uuid, uuid, text, jsonb, text) TO authenticated;

COMMENT ON FUNCTION save_advancing_grid_data IS 
'Saves grid data for advancing sessions (team, arrival_flight, departure_flight). Bypasses RLS issues.';

