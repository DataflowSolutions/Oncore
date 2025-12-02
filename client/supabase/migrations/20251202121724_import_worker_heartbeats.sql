-- Worker heartbeat tracking for import workers
-- Uses database storage instead of in-memory to support serverless deployments

-- Table to track active import workers
create table if not exists import_worker_heartbeats (
  worker_id text primary key,
  worker_type text not null default 'semantic',
  last_heartbeat timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for cleanup queries
create index idx_import_worker_heartbeats_last on import_worker_heartbeats(last_heartbeat);

-- Enable RLS but allow service role full access
alter table import_worker_heartbeats enable row level security;

-- Service role can do everything (workers run with service role)
create policy "Service role full access to worker heartbeats"
  on import_worker_heartbeats
  for all
  using (true)
  with check (true);

-- RPC: Register/update worker heartbeat
create or replace function app_register_worker_heartbeat(
  p_worker_id text,
  p_worker_type text default 'semantic'
)
returns json
language plpgsql
security definer
as $$
declare
  v_timeout_seconds int := 30;
  v_active_count int;
begin
  -- Upsert worker heartbeat
  insert into import_worker_heartbeats (worker_id, worker_type, last_heartbeat)
  values (p_worker_id, p_worker_type, now())
  on conflict (worker_id) do update
  set last_heartbeat = now(),
      worker_type = p_worker_type;

  -- Clean up stale workers
  delete from import_worker_heartbeats
  where last_heartbeat < now() - (v_timeout_seconds || ' seconds')::interval;

  -- Count active workers
  select count(*) into v_active_count
  from import_worker_heartbeats
  where last_heartbeat >= now() - (v_timeout_seconds || ' seconds')::interval;

  return json_build_object(
    'status', 'ok',
    'worker_id', p_worker_id,
    'active_workers', v_active_count
  );
end;
$$;

-- RPC: Get worker health status
create or replace function app_get_worker_health()
returns json
language plpgsql
security definer
as $$
declare
  v_timeout_seconds int := 30;
  v_active_count int;
  v_workers json;
begin
  -- Clean up stale workers first
  delete from import_worker_heartbeats
  where last_heartbeat < now() - (v_timeout_seconds || ' seconds')::interval;

  -- Count active workers
  select count(*) into v_active_count
  from import_worker_heartbeats;

  -- Get worker details
  select coalesce(json_agg(json_build_object(
    'worker_id', worker_id,
    'worker_type', worker_type,
    'last_heartbeat_sec', extract(epoch from (now() - last_heartbeat))::int
  )), '[]'::json)
  into v_workers
  from import_worker_heartbeats;

  return json_build_object(
    'healthy', v_active_count > 0,
    'active_workers', v_active_count,
    'workers', v_workers
  );
end;
$$;

-- Grant execute to authenticated and service role
grant execute on function app_register_worker_heartbeat(text, text) to authenticated, service_role;
grant execute on function app_get_worker_health() to authenticated, service_role;

comment on table import_worker_heartbeats is 'Tracks active import workers via periodic heartbeats';
comment on function app_register_worker_heartbeat is 'Register or update a worker heartbeat';
comment on function app_get_worker_health is 'Get current worker health status';
