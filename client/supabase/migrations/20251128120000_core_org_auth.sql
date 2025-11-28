-- Core org/auth-adjacent schema (clean slate, excluding Supabase auth internals)
-- Defines enums up-front so later migrations can reference them.

-- Enumerations
create type member_role as enum ('owner', 'admin', 'editor', 'viewer');
create type member_status as enum ('active', 'invited', 'suspended');
create type invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type member_type as enum ('artist', 'crew', 'management', 'vendor', 'other');
create type contact_type as enum ('promoter', 'venue', 'agent', 'other');
create type contact_status as enum ('active', 'inactive');
create type advancing_party as enum ('artist', 'promoter', 'other');
create type show_status as enum ('draft', 'confirmed', 'cancelled');
create type schedule_item_type as enum (
  'custom', 'load_in', 'soundcheck', 'doors', 'set_time', 'load_out',
  'arrival', 'departure', 'hotel', 'transport', 'catering',
  'meeting', 'press', 'technical'
);
create type schedule_visibility as enum (
  'all', 'artist_team', 'promoter_team', 'crew', 'management',
  'venue_staff', 'security', 'session_specific'
);
create type ingestion_status as enum ('pending', 'accepted', 'rejected', 'error');
create type import_job_status as enum ('pending', 'running', 'completed', 'failed');
create type calendar_source_status as enum ('active', 'paused', 'error');
create type calendar_run_status as enum ('pending', 'running', 'success', 'failed');

-- Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  status text not null default 'active',
  plan_tier text not null default 'free',
  created_at timestamptz not null default now()
);

-- Org members
create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role member_role not null default 'editor',
  status member_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index org_members_user_idx on org_members (user_id);

-- Invitations
create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email citext not null,
  role member_role not null default 'viewer',
  token text not null unique,
  status invitation_status not null default 'pending',
  expires_at timestamptz,
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_org_idx on invitations (org_id, status);
