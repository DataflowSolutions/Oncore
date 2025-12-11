-- Ingestion, calendar sync, and activity logging

-- Parsed emails (ingestion inbox)
create table parsed_emails (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  from_email citext,
  subject text,
  raw_content text,
  parsed_data jsonb,
  status ingestion_status not null default 'pending',
  confidence numeric,
  reviewed_by uuid,
  reviewed_at timestamptz,
  linked_show_id uuid references shows(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index parsed_emails_org_idx on parsed_emails (org_id, status);

-- Parsed contracts
create table parsed_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  file_name text,
  file_url text,
  parsed_data jsonb,
  status ingestion_status not null default 'pending',
  confidence numeric,
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index parsed_contracts_org_idx on parsed_contracts (org_id, status);

-- Import jobs (AI/CSV/etc.)
create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  status import_job_status not null default 'pending',
  error text,
  payload jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index import_jobs_org_idx on import_jobs (org_id, status);

-- Calendar sync sources
create table calendar_sync_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source_name text,
  source_url text not null,
  status calendar_source_status not null default 'active',
  sync_interval_minutes integer not null default 60,
  last_synced_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendar_sources_org_idx on calendar_sync_sources (org_id, status);

-- Calendar sync runs
create table calendar_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references calendar_sync_sources(id) on delete cascade,
  status calendar_run_status not null default 'pending',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  events_processed integer,
  message text
);
create index calendar_sync_runs_source_idx on calendar_sync_runs (source_id, status);

-- Activity log
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  action text not null,
  category text,
  resource_type text not null,
  resource_id text,
  user_id uuid,
  user_agent text,
  ip_address inet,
  details jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_org_idx on activity_log (org_id, created_at);
