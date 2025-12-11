-- Fix semantic import RPCs to allow service role (workers) access
-- Workers run with service role key and don't have auth.uid()
-- 
-- NOTE: The original migration uses TEXT types for:
--   - import_jobs.extraction_stage (TEXT, not enum)
--   - import_resolutions.resolution_state (TEXT, not enum)

set check_function_bodies = off;

-- Update app_insert_import_facts to allow service role
create or replace function app_insert_import_facts(
  p_job_id uuid,
  p_facts jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_fact jsonb;
  v_org_id uuid;
begin
  -- Get org_id for the job
  select org_id into v_org_id from import_jobs where id = p_job_id;
  if not found then
    raise exception 'Import job not found';
  end if;

  -- Allow service role (workers) OR org members
  if not (is_service_role() or is_org_member(v_org_id)) then
    raise exception 'Access denied';
  end if;

  -- Insert each fact
  for v_fact in select * from jsonb_array_elements(p_facts)
  loop
    insert into import_facts (
      job_id,
      message_index,
      chunk_index,
      source_id,
      source_file_name,
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
    ) values (
      p_job_id,
      coalesce((v_fact->>'message_index')::integer, 0),
      coalesce((v_fact->>'chunk_index')::integer, 0),
      v_fact->>'source_id',
      v_fact->>'source_file_name',
      coalesce((v_fact->>'speaker_role')::import_fact_speaker, 'unknown'),
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
      coalesce((v_fact->>'direction')::import_fact_direction, 'unknown'),
      coalesce((v_fact->>'status')::import_fact_status, 'unknown'),
      (v_fact->>'confidence')::numeric,
      v_fact->>'extraction_reason',
      v_fact->>'raw_snippet',
      (v_fact->>'raw_snippet_start')::integer,
      (v_fact->>'raw_snippet_end')::integer
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Update app_get_import_facts to allow service role
create or replace function app_get_import_facts(
  p_job_id uuid
) returns setof import_facts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Get org_id for the job
  select org_id into v_org_id from import_jobs where id = p_job_id;
  if not found then
    raise exception 'Import job not found';
  end if;

  -- Allow service role (workers) OR org members
  if not (is_service_role() or is_org_member(v_org_id)) then
    raise exception 'Access denied';
  end if;

  return query
  select f.* 
  from import_facts f
  where f.job_id = p_job_id
  order by f.message_index, f.chunk_index, f.created_at;
end;
$$;

-- Update app_select_import_facts to allow service role
create or replace function app_select_import_facts(
  p_job_id uuid,
  p_selections jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_selection jsonb;
  v_fact_id uuid;
  v_org_id uuid;
begin
  -- Get org_id for the job
  select org_id into v_org_id from import_jobs where id = p_job_id;
  if not found then
    raise exception 'Import job not found';
  end if;

  -- Allow service role (workers) OR org members
  if not (is_service_role() or is_org_member(v_org_id)) then
    raise exception 'Access denied';
  end if;

  -- Process each selection
  for v_selection in select * from jsonb_array_elements(p_selections)
  loop
    v_fact_id := (v_selection->>'fact_id')::uuid;
    
    if v_fact_id is not null then
      update import_facts
      set 
        is_selected = true,
        selection_reason = v_selection->>'reason',
        selected_at = now(),
        updated_at = now()
      where id = v_fact_id
      and job_id = p_job_id;
      
      if found then
        v_count := v_count + 1;
      end if;
    end if;
    
    -- Insert resolution record
    -- Note: resolution_state is TEXT not enum
    insert into import_resolutions (
      job_id,
      fact_type,
      fact_domain,
      selected_fact_id,
      resolution_state,
      resolution_reason,
      reasoning_trace,
      final_value_text,
      final_value_number,
      final_value_date
    ) values (
      p_job_id,
      (v_selection->>'fact_type')::import_fact_type,
      v_selection->>'fact_domain',
      v_fact_id,
      coalesce(v_selection->>'state', 'resolved'),
      v_selection->>'reason',
      v_selection->'reasoning_trace',
      v_selection->>'final_value_text',
      (v_selection->>'final_value_number')::numeric,
      (v_selection->>'final_value_date')::date
    );
  end loop;

  return v_count;
end;
$$;

-- Update app_update_import_job_stage to allow service role
-- Note: p_stage is TEXT, not enum - matching original migration
create or replace function app_update_import_job_stage(
  p_job_id uuid,
  p_stage text,
  p_facts_extracted_at timestamptz default null,
  p_resolution_completed_at timestamptz default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Get org_id for the job
  select org_id into v_org_id from import_jobs where id = p_job_id;
  if not found then
    raise exception 'Import job not found';
  end if;

  -- Allow service role (workers) OR org members
  if not (is_service_role() or is_org_member(v_org_id)) then
    raise exception 'Access denied';
  end if;

  update import_jobs
  set 
    extraction_stage = p_stage,
    facts_extracted_at = coalesce(p_facts_extracted_at, facts_extracted_at),
    resolution_completed_at = coalesce(p_resolution_completed_at, resolution_completed_at),
    updated_at = now()
  where id = p_job_id;

  return true;
end;
$$;

-- Update app_get_import_resolutions to allow service role
create or replace function app_get_import_resolutions(
  p_job_id uuid
) returns setof import_resolutions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Get org_id for the job
  select org_id into v_org_id from import_jobs where id = p_job_id;
  if not found then
    raise exception 'Import job not found';
  end if;

  -- Allow service role (workers) OR org members
  if not (is_service_role() or is_org_member(v_org_id)) then
    raise exception 'Access denied';
  end if;

  return query
  select r.* 
  from import_resolutions r
  where r.job_id = p_job_id
  order by r.fact_type, r.created_at;
end;
$$;

-- Also update RLS policies to include service role
-- Drop and recreate policies for import_facts
drop policy if exists "import_facts_select_via_rpc" on import_facts;
drop policy if exists "import_facts_insert_via_rpc" on import_facts;
drop policy if exists "import_facts_update_via_rpc" on import_facts;

create policy "import_facts_select_via_rpc" on import_facts
  for select using (
    is_service_role() or
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_facts.job_id 
      and is_org_member(ij.org_id)
    )
  );

create policy "import_facts_insert_via_rpc" on import_facts
  for insert with check (
    is_service_role() or
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_facts.job_id 
      and is_org_member(ij.org_id)
    )
  );

create policy "import_facts_update_via_rpc" on import_facts
  for update using (
    is_service_role() or
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_facts.job_id 
      and is_org_member(ij.org_id)
    )
  );

-- Drop and recreate policies for import_resolutions
drop policy if exists "import_resolutions_select_via_rpc" on import_resolutions;
drop policy if exists "import_resolutions_insert_via_rpc" on import_resolutions;

create policy "import_resolutions_select_via_rpc" on import_resolutions
  for select using (
    is_service_role() or
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_resolutions.job_id 
      and is_org_member(ij.org_id)
    )
  );

create policy "import_resolutions_insert_via_rpc" on import_resolutions
  for insert with check (
    is_service_role() or
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_resolutions.job_id 
      and is_org_member(ij.org_id)
    )
  );
