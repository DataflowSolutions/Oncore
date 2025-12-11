-- RPC to claim pending import jobs for background worker processing
set check_function_bodies = off;

create or replace function app_claim_next_import_jobs(p_limit integer default 3)
returns setof import_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_service boolean;
begin
  -- Only allow service role to claim jobs to avoid cross-org access by regular users
  v_is_service := current_setting('request.jwt.claim.role', true) = 'service_role';
  if not v_is_service then
    raise exception 'Access denied';
  end if;

  return query
  with candidates as (
    select id
    from import_jobs
    where status = 'pending'
    order by created_at
    limit coalesce(p_limit, 3)
    for update skip locked
  ),
  updated as (
    update import_jobs ij
    set status = 'processing',
        updated_at = now()
    where ij.id in (select id from candidates)
    returning ij.*
  )
  select * from updated;
end;
$$;
