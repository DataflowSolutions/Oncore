-- =============================================================================
-- Fix import facts RPC functions to allow service role access
-- Workers run with service role key and don't have auth.uid()
-- =============================================================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS app_insert_import_facts(uuid, jsonb);
DROP FUNCTION IF EXISTS app_get_import_facts(uuid);
DROP FUNCTION IF EXISTS app_select_import_facts(uuid, jsonb);
DROP FUNCTION IF EXISTS app_get_import_resolutions(uuid);
DROP FUNCTION IF EXISTS app_update_import_job_stage(uuid, text, timestamptz, timestamptz);

-- Update app_insert_import_facts to allow service role
CREATE OR REPLACE FUNCTION app_insert_import_facts(
  p_job_id uuid,
  p_facts jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_fact jsonb;
  v_org_id uuid;
BEGIN
  -- Get org_id for the job
  SELECT org_id INTO v_org_id FROM import_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import job not found';
  END IF;

  -- Allow service role (workers) OR org members
  IF NOT (is_service_role() OR is_org_member(v_org_id)) THEN
    RAISE EXCEPTION 'Access denied or job not found';
  END IF;

  -- Insert each fact
  FOR v_fact IN SELECT * FROM jsonb_array_elements(p_facts)
  LOOP
    INSERT INTO import_facts (
      job_id,
      message_index,
      chunk_index,
      source_id,
      source_file_name,
      source_scope,
      speaker_role,
      speaker_name,
      fact_type,
      fact_domain,
      value_text,
      value_number,
      value_boolean,
      value_date,
      value_time,
      value_datetime,
      currency,
      unit,
      direction,
      status,
      confidence,
      extraction_reason,
      raw_snippet,
      raw_snippet_start,
      raw_snippet_end
    ) VALUES (
      p_job_id,
      COALESCE((v_fact->>'message_index')::integer, 0),
      COALESCE((v_fact->>'chunk_index')::integer, 0),
      v_fact->>'source_id',
      v_fact->>'source_file_name',
      v_fact->>'source_scope',
      COALESCE((v_fact->>'speaker_role')::import_fact_speaker, 'unknown'),
      v_fact->>'speaker_name',
      (v_fact->>'fact_type')::import_fact_type,
      v_fact->>'fact_domain',
      v_fact->>'value_text',
      (v_fact->>'value_number')::numeric,
      (v_fact->>'value_boolean')::boolean,
      (v_fact->>'value_date')::date,
      (v_fact->>'value_time')::time,
      (v_fact->>'value_datetime')::timestamptz,
      v_fact->>'currency',
      v_fact->>'unit',
      COALESCE((v_fact->>'direction')::import_fact_direction, 'unknown'),
      COALESCE((v_fact->>'status')::import_fact_status, 'unknown'),
      (v_fact->>'confidence')::numeric,
      v_fact->>'extraction_reason',
      v_fact->>'raw_snippet',
      (v_fact->>'raw_snippet_start')::integer,
      (v_fact->>'raw_snippet_end')::integer
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Update app_get_import_facts to allow service role
CREATE OR REPLACE FUNCTION app_get_import_facts(
  p_job_id uuid
) RETURNS SETOF import_facts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get org_id for the job
  SELECT org_id INTO v_org_id FROM import_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import job not found';
  END IF;

  -- Allow service role (workers) OR org members
  IF NOT (is_service_role() OR is_org_member(v_org_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT f.* 
  FROM import_facts f
  WHERE f.job_id = p_job_id
  ORDER BY f.message_index, f.chunk_index, f.created_at;
END;
$$;

-- Update app_select_import_facts to allow service role
CREATE OR REPLACE FUNCTION app_select_import_facts(
  p_job_id uuid,
  p_selections jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_selection jsonb;
  v_fact_id uuid;
  v_org_id uuid;
BEGIN
  -- Get org_id for the job
  SELECT org_id INTO v_org_id FROM import_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import job not found';
  END IF;

  -- Allow service role (workers) OR org members
  IF NOT (is_service_role() OR is_org_member(v_org_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Process each selection
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_fact_id := (v_selection->>'fact_id')::uuid;
    
    IF v_fact_id IS NOT NULL THEN
      UPDATE import_facts
      SET 
        is_selected = true,
        selection_reason = v_selection->>'reason',
        selected_at = now(),
        updated_at = now()
      WHERE id = v_fact_id
      AND job_id = p_job_id;
      
      IF found THEN
        v_count := v_count + 1;
      END IF;
    END IF;
    
    -- Insert resolution record
    INSERT INTO import_resolutions (
      job_id,
      fact_type,
      fact_domain,
      selected_fact_id,
      resolution_state,
      resolution_reason,
      final_value_text,
      final_value_number,
      final_value_date,
      reasoning_trace
    )
    SELECT
      p_job_id,
      (v_selection->>'fact_type')::import_fact_type,
      v_selection->>'fact_domain',
      v_fact_id,
      COALESCE(v_selection->>'state', 'resolved'),
      COALESCE(v_selection->>'reason', 'Selected by semantic resolution'),
      v_selection->>'final_value_text',
      (v_selection->>'final_value_number')::numeric,
      (v_selection->>'final_value_date')::date,
      v_selection->'reasoning_trace';
  END LOOP;

  RETURN v_count;
END;
$$;

-- Update app_get_import_resolutions to allow service role
CREATE OR REPLACE FUNCTION app_get_import_resolutions(
  p_job_id uuid
) RETURNS SETOF import_resolutions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get org_id for the job
  SELECT org_id INTO v_org_id FROM import_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import job not found';
  END IF;

  -- Allow service role (workers) OR org members
  IF NOT (is_service_role() OR is_org_member(v_org_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT r.* 
  FROM import_resolutions r
  WHERE r.job_id = p_job_id
  ORDER BY r.fact_type, r.created_at;
END;
$$;

-- Update app_update_import_job_stage to allow service role
CREATE OR REPLACE FUNCTION app_update_import_job_stage(
  p_job_id uuid,
  p_stage text,
  p_facts_extracted_at timestamptz DEFAULT NULL,
  p_resolution_completed_at timestamptz DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get org_id for the job
  SELECT org_id INTO v_org_id FROM import_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import job not found';
  END IF;

  -- Allow service role (workers) OR org members
  IF NOT (is_service_role() OR is_org_member(v_org_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE import_jobs
  SET 
    extraction_stage = p_stage,
    facts_extracted_at = COALESCE(p_facts_extracted_at, facts_extracted_at),
    resolution_completed_at = COALESCE(p_resolution_completed_at, resolution_completed_at),
    updated_at = now()
  WHERE id = p_job_id;

  RETURN true;
END;
$$;
