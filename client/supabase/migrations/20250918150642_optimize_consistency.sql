-- Optimization and consistency improvements for Oncore (Oncore)
-- 1. Remove redundant RLS policy (favor RPC approach for invites)
-- 2. Add performance indexes
-- 3. Improve storage RPC with metadata validation
-- 4. Add foundation for future auditing

-- =====================================
-- 1. CONSISTENCY: REMOVE REDUNDANT RLS POLICY
-- =====================================
-- Since we have app_accept_show_invite RPC, remove the direct RLS claim policy
-- This funnels all invite acceptance through the controlled RPC
drop policy if exists show_collaborators_claim on show_collaborators;

-- =====================================
-- 2. PERFORMANCE INDEXES
-- =====================================
-- Index on email for invite lookups
create index if not exists idx_show_collaborators_email on show_collaborators(email);

-- Index on show_collaborators for faster collaboration checks
create index if not exists idx_show_collaborators_show_user on show_collaborators(show_id, user_id);

-- Index on org_members for faster role checks
create index if not exists idx_org_members_user_role on org_members(user_id, role);

-- =====================================
-- 3. IMPROVED STORAGE RPC WITH ENFORCED METADATA
-- =====================================
-- Drop old function and create new one with proper name
-- Clean up legacy function names
drop function if exists app_upload_file_with_metadata(text, text, uuid, uuid, uuid, uuid, uuid, party_type_enum, text, text, int);

-- Note: app_upload_file function definition moved to storage_metadata_enforcement migration
-- to avoid conflicts and provide proper Edge Function integration

-- =====================================
-- 4. ACTIVITY LOG FOUNDATION (with partitioning for scale)
-- =====================================
-- Create activity log table for audit trail
-- NOTE: Consider monthly partitioning for production scale
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- TODO: Add monthly partitioning when activity volume increases
-- Example for future implementation:
-- CREATE TABLE activity_log_2025_09 PARTITION OF activity_log
-- FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Index for activity log queries
create index if not exists idx_activity_log_org_time on activity_log(org_id, created_at desc);
create index if not exists idx_activity_log_user_time on activity_log(user_id, created_at desc);
create index if not exists idx_activity_log_resource on activity_log(resource_type, resource_id);

-- Enable RLS on activity log
alter table activity_log enable row level security;

-- Activity log policies (org members can read their org's logs)
create policy activity_log_select on activity_log for select
  using (is_org_member(org_id));

-- Only system can insert activity logs (via triggers or RPCs)
create policy activity_log_insert on activity_log for insert
  with check (false); -- Prevent direct inserts, use RPC only

-- RPC function to log activities
create or replace function app_log_activity(
  p_org_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_details jsonb default null
) returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  insert into activity_log (
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) values (
    p_org_id,
    current_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  );
end;
$$;

-- Helper function to archive old activity logs (call via scheduled job)
create or replace function archive_old_activity_logs(days_to_keep int default 90)
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  -- Archive logs older than specified days
  -- In production, you might want to move to cold storage instead of delete
  delete from activity_log 
  where created_at < now() - interval '1 day' * days_to_keep;
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- =====================================
-- 5. ENHANCED ORGANIZATION CREATION WITH LOGGING
-- =====================================
-- Update org creation RPC to include activity logging
create or replace function app_create_organization_with_owner(
  org_name text,
  org_slug text
) returns uuid
language plpgsql
security definer
as $$
declare
  new_org_id uuid;
  current_user_id uuid;
begin
  -- Get current user
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  -- Insert organization
  insert into organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  -- Add creator as owner
  insert into org_members (org_id, user_id, role)
  values (new_org_id, current_user_id, 'owner');

  -- Log the activity
  perform app_log_activity(
    new_org_id,
    'create',
    'organization',
    new_org_id,
    jsonb_build_object('name', org_name, 'slug', org_slug)
  );

  return new_org_id;
end;
$$;

-- =====================================
-- 6. HELPER FUNCTIONS FOR COMMON OPERATIONS
-- =====================================

-- Function to check if a user can access a specific show
create or replace function app_can_access_show(p_show_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from shows s
    where s.id = p_show_id
      and (
        is_org_member(s.org_id)
        or exists(
          select 1 from show_collaborators sc
          where sc.show_id = s.id and sc.user_id = auth.uid()
        )
      )
  );
$$;

-- Function to get user's role in a show (org role or collaborator role)
create or replace function app_get_show_role(p_show_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    -- First check if user is org member (takes precedence)
    (select om.role::text
     from shows s
     join org_members om on om.org_id = s.org_id and om.user_id = auth.uid()
     where s.id = p_show_id),
    -- Then check if user is show collaborator
    (select sc.role::text
     from show_collaborators sc
     where sc.show_id = p_show_id and sc.user_id = auth.uid())
  );
$$;