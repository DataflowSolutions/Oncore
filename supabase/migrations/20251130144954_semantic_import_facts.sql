-- Semantic Import Facts Table
-- This table stores candidate facts extracted during Stage 1 of the import pipeline.
-- Facts are append-only per import run and used for semantic reasoning in Stage 2.
set check_function_bodies = off;

-- Enum for fact types (what domain the value belongs to)
create type import_fact_type as enum (
  'artist_fee',
  'venue_cost',
  'production_cost',
  'catering_cost',
  'accommodation_cost',
  'travel_cost',
  'other_cost',
  'event_date',
  'event_time',
  'set_time',
  'venue_name',
  'venue_city',
  'venue_country',
  'venue_capacity',
  'artist_name',
  'event_name',
  'hotel_name',
  'hotel_address',
  'hotel_checkin',
  'hotel_checkout',
  'flight_number',
  'flight_departure',
  'flight_arrival',
  'contact_name',
  'contact_email',
  'contact_phone',
  'contact_role',
  'currency',
  'payment_terms',
  'deal_type',
  'technical_requirement',
  'catering_detail',
  'activity_detail',
  'general_note',
  'other'
);

-- Enum for the direction of cost (who pays)
create type import_fact_direction as enum (
  'we_pay',
  'they_pay',
  'included',
  'external_cost',
  'split',
  'unknown'
);

-- Enum for the status of a fact (negotiation state)
create type import_fact_status as enum (
  'offer',
  'counter_offer',
  'accepted',
  'rejected',
  'withdrawn',
  'info',
  'question',
  'final',
  'unknown'
);

-- Enum for who made the statement
create type import_fact_speaker as enum (
  'artist',
  'artist_agent',
  'promoter',
  'venue',
  'production',
  'unknown'
);

-- Main import_facts table
create table import_facts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references import_jobs(id) on delete cascade,
  show_id uuid references shows(id) on delete set null,
  
  -- Ordering within the source
  message_index integer not null default 0,
  chunk_index integer not null default 0,
  source_id text,
  source_file_name text,
  
  -- Speaker attribution
  speaker_role import_fact_speaker not null default 'unknown',
  speaker_name text,
  
  -- Fact classification
  fact_type import_fact_type not null,
  fact_domain text, -- Optional grouping key (e.g., "hotel_1", "flight_artist")
  
  -- The actual value
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date date,
  value_time time,
  value_datetime timestamptz,
  
  -- Currency and units
  currency text,
  unit text,
  
  -- Cost direction
  direction import_fact_direction not null default 'unknown',
  
  -- Negotiation status
  status import_fact_status not null default 'unknown',
  
  -- References to other facts (e.g., "this counter-offer relates to fact X")
  supersedes_fact_id uuid references import_facts(id) on delete set null,
  related_fact_ids uuid[] default '{}',
  
  -- AI confidence in this extraction
  confidence numeric check (confidence >= 0 and confidence <= 1),
  extraction_reason text,
  
  -- Selection state (set during Stage 2)
  is_selected boolean not null default false,
  selection_reason text,
  selected_at timestamptz,
  
  -- Raw source snippet for auditability
  raw_snippet text,
  raw_snippet_start integer,
  raw_snippet_end integer,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient querying
create index idx_import_facts_job_id on import_facts(job_id);
create index idx_import_facts_show_id on import_facts(show_id);
create index idx_import_facts_fact_type on import_facts(fact_type);
create index idx_import_facts_is_selected on import_facts(is_selected);
create index idx_import_facts_job_type on import_facts(job_id, fact_type);
create index idx_import_facts_job_selected on import_facts(job_id, is_selected);

-- Comments for documentation
comment on table import_facts is 'Stores candidate facts extracted during import Stage 1. Each row is a single claim from the source material.';
comment on column import_facts.message_index is 'Ordering of this fact within the source (for respecting conversation order)';
comment on column import_facts.speaker_role is 'Who made this statement (artist, promoter, venue, etc.)';
comment on column import_facts.fact_type is 'What domain this fact belongs to (artist_fee, venue_cost, etc.)';
comment on column import_facts.status is 'Negotiation state of this fact (offer, counter, accepted, rejected)';
comment on column import_facts.is_selected is 'Whether this fact was selected as the canonical truth during Stage 2';
comment on column import_facts.raw_snippet is 'Original text slice from source for audit/debug';

-- Table for storing semantic resolution results
create table import_resolutions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references import_jobs(id) on delete cascade,
  
  -- Resolution metadata
  fact_type import_fact_type not null,
  fact_domain text, -- Optional grouping key
  
  -- Resolution result
  selected_fact_id uuid references import_facts(id) on delete set null,
  resolution_state text not null, -- 'resolved', 'unagreed', 'conflicting', 'missing'
  resolution_reason text not null,
  
  -- Final value (copied from selected fact for convenience)
  final_value_text text,
  final_value_number numeric,
  final_value_date date,
  
  -- AI reasoning trace
  reasoning_trace jsonb,
  
  -- Timestamps
  created_at timestamptz not null default now()
);

create index idx_import_resolutions_job_id on import_resolutions(job_id);
create index idx_import_resolutions_fact_type on import_resolutions(fact_type);

comment on table import_resolutions is 'Stores the semantic resolution decisions made during Stage 2 of import';

-- Add stage tracking to import_jobs
alter table import_jobs
  add column if not exists extraction_stage text default 'pending',
  add column if not exists facts_extracted_at timestamptz,
  add column if not exists resolution_completed_at timestamptz;

comment on column import_jobs.extraction_stage is 'Current stage: pending, extracting_facts, facts_complete, resolving, resolved, applying, completed';
comment on column import_jobs.facts_extracted_at is 'When Stage 1 (fact extraction) completed';
comment on column import_jobs.resolution_completed_at is 'When Stage 2 (semantic resolution) completed';

-- RPC to insert extracted facts (batch insert for efficiency)
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
begin
  -- Verify job exists and caller has access
  if not exists (
    select 1 from import_jobs ij 
    where ij.id = p_job_id 
    and is_org_member(ij.org_id)
  ) then
    raise exception 'Access denied or job not found';
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

comment on function app_insert_import_facts is 'Batch insert extracted facts for a job (Stage 1)';

-- RPC to get all facts for a job
create or replace function app_get_import_facts(
  p_job_id uuid
) returns setof import_facts
language sql
security definer
set search_path = public
as $$
  select f.* 
  from import_facts f
  inner join import_jobs ij on ij.id = f.job_id
  where f.job_id = p_job_id
  and is_org_member(ij.org_id)
  order by f.message_index, f.chunk_index, f.created_at;
$$;

comment on function app_get_import_facts is 'Get all facts for a job ordered by source position';

-- RPC to mark facts as selected (Stage 2)
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
begin
  -- Verify job exists and caller has access
  if not exists (
    select 1 from import_jobs ij 
    where ij.id = p_job_id 
    and is_org_member(ij.org_id)
  ) then
    raise exception 'Access denied or job not found';
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
    insert into import_resolutions (
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
    select
      p_job_id,
      (v_selection->>'fact_type')::import_fact_type,
      v_selection->>'fact_domain',
      v_fact_id,
      coalesce(v_selection->>'state', 'resolved'),
      coalesce(v_selection->>'reason', 'Selected by semantic resolution'),
      v_selection->>'final_value_text',
      (v_selection->>'final_value_number')::numeric,
      (v_selection->>'final_value_date')::date,
      v_selection->'reasoning_trace';
  end loop;

  return v_count;
end;
$$;

comment on function app_select_import_facts is 'Mark facts as selected and record resolution decisions (Stage 2)';

-- RPC to update job extraction stage
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
begin
  -- Verify job exists and caller has access
  if not exists (
    select 1 from import_jobs ij 
    where ij.id = p_job_id 
    and is_org_member(ij.org_id)
  ) then
    raise exception 'Access denied or job not found';
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

comment on function app_update_import_job_stage is 'Update the extraction stage of an import job';

-- RPC to get resolutions for a job
create or replace function app_get_import_resolutions(
  p_job_id uuid
) returns setof import_resolutions
language sql
security definer
set search_path = public
as $$
  select r.* 
  from import_resolutions r
  inner join import_jobs ij on ij.id = r.job_id
  where r.job_id = p_job_id
  and is_org_member(ij.org_id)
  order by r.fact_type, r.created_at;
$$;

comment on function app_get_import_resolutions is 'Get all resolution decisions for a job';

-- Enable RLS on new tables
alter table import_facts enable row level security;
alter table import_resolutions enable row level security;

-- RLS policies for import_facts (only through RPCs with security definer)
create policy "import_facts_select_via_rpc" on import_facts
  for select using (
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_facts.job_id 
      and is_org_member(ij.org_id)
    )
  );

create policy "import_facts_insert_via_rpc" on import_facts
  for insert with check (
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_facts.job_id 
      and is_org_member(ij.org_id)
    )
  );

create policy "import_facts_update_via_rpc" on import_facts
  for update using (
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_facts.job_id 
      and is_org_member(ij.org_id)
    )
  );

-- RLS policies for import_resolutions
create policy "import_resolutions_select_via_rpc" on import_resolutions
  for select using (
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_resolutions.job_id 
      and is_org_member(ij.org_id)
    )
  );

create policy "import_resolutions_insert_via_rpc" on import_resolutions
  for insert with check (
    exists (
      select 1 from import_jobs ij 
      where ij.id = import_resolutions.job_id 
      and is_org_member(ij.org_id)
    )
  );
