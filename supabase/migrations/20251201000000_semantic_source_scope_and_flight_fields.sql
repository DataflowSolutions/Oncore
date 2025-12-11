-- Semantic import foundation updates
-- Adds source_scope to import_facts and granular flight fact types to import_fact_type.
set check_function_bodies = off;

--------------------------------------------------------------------------------
-- New enum: source_scope
--------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'source_scope') then
    create type source_scope as enum (
      'contract_main',
      'itinerary',
      'confirmation',
      'rider_example',
      'general_info',
      'unknown'
    );
  end if;
end;
$$;

--------------------------------------------------------------------------------
-- Add source_scope column to import_facts
--------------------------------------------------------------------------------
alter table import_facts
  add column if not exists source_scope source_scope not null default 'unknown';

comment on column import_facts.source_scope is 'Document-level provenance for this fact (contract, itinerary, rider, etc.)';

--------------------------------------------------------------------------------
-- Extend import_fact_type with granular flight fields
--------------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_origin_city'
  ) then
    alter type import_fact_type add value 'flight_origin_city';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_origin_airport'
  ) then
    alter type import_fact_type add value 'flight_origin_airport';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_destination_city'
  ) then
    alter type import_fact_type add value 'flight_destination_city';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_destination_airport'
  ) then
    alter type import_fact_type add value 'flight_destination_airport';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_departure_datetime'
  ) then
    alter type import_fact_type add value 'flight_departure_datetime';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_arrival_datetime'
  ) then
    alter type import_fact_type add value 'flight_arrival_datetime';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_airline'
  ) then
    alter type import_fact_type add value 'flight_airline';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_passenger_name'
  ) then
    alter type import_fact_type add value 'flight_passenger_name';
  end if;
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'flight_booking_reference'
  ) then
    alter type import_fact_type add value 'flight_booking_reference';
  end if;
end;
$$;

--------------------------------------------------------------------------------
-- Update RPCs to include source_scope
--------------------------------------------------------------------------------

-- app_insert_import_facts: include source_scope in inserts
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
    ) values (
      p_job_id,
      coalesce((v_fact->>'message_index')::integer, 0),
      coalesce((v_fact->>'chunk_index')::integer, 0),
      v_fact->>'source_id',
      v_fact->>'source_file_name',
      coalesce((v_fact->>'source_scope')::source_scope, 'unknown'),
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

-- app_get_import_facts: unchanged except new column is included automatically
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

-- app_select_import_facts: signature unchanged (no source_scope mutation needed)
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
