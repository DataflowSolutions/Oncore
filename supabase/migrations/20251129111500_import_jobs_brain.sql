-- Import job storage and RPCs for the import brain skeleton
set check_function_bodies = off;

-- Extend status enum to support processing + committed lifecycle states
alter type import_job_status add value if not exists 'processing';
alter type import_job_status add value if not exists 'committed';

-- Add richer payload columns for raw sources and extracted data
alter table import_jobs
  add column if not exists raw_sources jsonb not null default '[]'::jsonb,
  add column if not exists extracted jsonb,
  add column if not exists confidence_map jsonb,
  add column if not exists committed_show_id uuid references shows(id) on delete set null;

comment on column import_jobs.raw_sources is 'Array of raw sources for the import job (text + metadata)';
comment on column import_jobs.extracted is 'Structured ImportData extracted from sources';
comment on column import_jobs.confidence_map is 'Per-field confidence scores for extracted data';
comment on column import_jobs.committed_show_id is 'Show id the import was committed to';

-- Create a new import job (stores raw sources)
create or replace function app_create_import_job(
  p_org_id uuid,
  p_raw_sources jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;

  insert into import_jobs (org_id, raw_sources, status, payload, created_by)
  values (p_org_id, coalesce(p_raw_sources, '[]'::jsonb), 'pending', null, auth.uid())
  returning id into v_job_id;

  return v_job_id;
end;
$$;

-- Update extracted payload + confidence and optional status/error
create or replace function app_update_import_job_extracted(
  p_job_id uuid,
  p_extracted jsonb default null,
  p_confidence_map jsonb default null,
  p_new_status import_job_status default null,
  p_error text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from import_jobs where id = p_job_id;
  if not found then
    raise exception 'Import job not found';
  end if;

  if not is_org_member(v_org_id) then
    raise exception 'Access denied';
  end if;

  update import_jobs
  set extracted = coalesce(p_extracted, extracted),
      confidence_map = coalesce(p_confidence_map, confidence_map),
      status = coalesce(p_new_status, case when p_extracted is not null then 'completed' else status end),
      error = p_error,
      updated_at = now()
  where id = p_job_id;

  return true;
end;
$$;

-- Mark an import job as committed to a show
create or replace function app_mark_import_job_committed(
  p_job_id uuid,
  p_show_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_show_org uuid;
begin
  select org_id into v_org_id from import_jobs where id = p_job_id;
  if not found then
    raise exception 'Import job not found';
  end if;

  select org_id into v_show_org from shows where id = p_show_id;
  if not found then
    raise exception 'Show not found';
  end if;

  if v_org_id is distinct from v_show_org or not is_org_member(v_org_id) then
    raise exception 'Access denied';
  end if;

  update import_jobs
  set committed_show_id = p_show_id,
      status = 'committed',
      updated_at = now()
  where id = p_job_id;

  return true;
end;
$$;

-- Fetch an import job with membership guard
create or replace function app_get_import_job(p_job_id uuid)
returns import_jobs
language sql
security definer
set search_path = public
as $$
  select * from import_jobs ij
  where ij.id = p_job_id
    and is_org_member(ij.org_id)
  limit 1;
$$;
