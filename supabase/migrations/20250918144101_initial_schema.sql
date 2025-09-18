-- Initial schema for Oncore (MusicApp)
-- Creates organizations, members, shows, advancing, team, and all supporting tables

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- =====================================
-- ORGANIZATIONS AND MEMBERS
-- =====================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create type org_role as enum ('owner','admin','editor','viewer');

create table org_members (
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid not null,
  role org_role not null,
  invited_email text,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- =====================================
-- ARTISTS AND VENUES
-- =====================================

create table artists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text, 
  city text, 
  country text,
  capacity int,
  contacts jsonb,
  created_at timestamptz not null default now()
);

-- =====================================
-- SHOWS
-- =====================================

create type show_status as enum ('draft','confirmed','cancelled');

create table shows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  artist_id uuid references artists(id) on delete set null,
  venue_id uuid references venues(id),
  date date not null,
  doors_at timestamptz,
  set_time timestamptz,
  status show_status not null default 'draft',
  title text,
  notes text,
  created_at timestamptz not null default now()
);

create type show_collab_role as enum ('promoter_editor','promoter_viewer');

create table show_collaborators (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  user_id uuid,
  email text not null,
  role show_collab_role not null default 'promoter_editor',
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (show_id, email)
);

-- =====================================
-- ADVANCING SYSTEM
-- =====================================

create type party as enum ('from_us','from_you');
create type field_status as enum ('pending','confirmed');

create table advancing_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  title text not null,
  access_code_hash text,   -- hash only, never plaintext
  expires_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table advancing_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid not null references advancing_sessions(id) on delete cascade,
  section text not null,
  field_name text not null,
  field_type text not null default 'text',  -- 'text','textarea','file','date','time','number','grid'
  value jsonb,                              -- for 'grid' store {columns,rows}
  status field_status not null default 'pending',
  party_type party not null,
  sort_order int not null default 1000,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (session_id, section, field_name, party_type)
);

create table advancing_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  field_id uuid not null references advancing_fields(id) on delete cascade,
  author_id uuid,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

-- Session-level "Documents" boxes (multi-file, any type)
create table advancing_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid not null references advancing_sessions(id) on delete cascade,
  party_type party not null,
  label text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- =====================================
-- FILE REGISTRY
-- =====================================

-- File registry (maps to storage)
create table files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  session_id uuid references advancing_sessions(id) on delete cascade,
  document_id uuid references advancing_documents(id) on delete cascade,
  field_id uuid references advancing_fields(id) on delete cascade,
  storage_path text not null,
  original_name text,
  content_type text,
  size_bytes int,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

-- =====================================
-- TEAM AND PEOPLE
-- =====================================

create table people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,       -- optional link to auth.users
  name text not null,
  email text, 
  phone text, 
  role_title text, 
  notes text,
  created_at timestamptz not null default now()
);

create table show_assignments (
  show_id uuid references shows(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  duty text,
  primary key (show_id, person_id)
);

-- =====================================
-- SCHEDULE (DAY VIEW)
-- =====================================

create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid references shows(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  title text not null,
  location text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

create index on shows (org_id, date);
create index on show_collaborators (show_id, email);
create index on advancing_sessions (org_id, show_id);
create index on advancing_fields (session_id, party_type);
create index on files (session_id);
create index on schedule_items (org_id, starts_at);
create index on people (org_id);
create index on artists (org_id);
create index on venues (org_id);