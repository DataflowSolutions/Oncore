-- Allow service role (workers) to update import jobs without user context
-- Workers run with service role key and don't have auth.uid()

-- Helper function to check if current role is service role
create or replace function is_service_role()
returns boolean
language plpgsql
security definer
stable
as $$
begin
  -- Check if current role is the service role (postgres or service_role)
  return current_user in ('postgres', 'service_role', 'authenticator');
end;
$$;

-- Update the app_update_import_job_extracted to allow service role
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

  -- Allow service role (workers) OR org members
  if not (is_service_role() or is_org_member(v_org_id)) then
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

-- Also update app_update_import_job_progress for consistency
create or replace function app_update_import_job_progress(
  p_job_id uuid,
  p_progress_data jsonb
)
returns void
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

  -- Allow service role (workers) OR org members
  if not (is_service_role() or is_org_member(v_org_id)) then
    raise exception 'Access denied';
  end if;

  update import_jobs
  set
    progress_data = p_progress_data,
    updated_at = now()
  where id = p_job_id;
end;
$$;
