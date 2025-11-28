-- Org directory primitives: artists, people, venues, contacts

-- People (crew/management/etc.)
create table people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email citext,
  phone text,
  member_type member_type,
  role_title text,
  notes text,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index people_org_idx on people (org_id);
create index people_user_idx on people (user_id);

-- Venues
create table venues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  city text,
  country text,
  capacity integer,
  notes text,
  created_at timestamptz not null default now()
);
create index venues_org_idx on venues (org_id);

-- Contacts / promoters
create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email citext,
  phone text,
  company text,
  city text,
  country text,
  role text,
  contact_type contact_type not null default 'promoter',
  status contact_status not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);
create index contacts_org_idx on contacts (org_id, contact_type);

-- Link contacts to venues with an explicit role
create table venue_contacts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  is_primary boolean not null default false,
  role_label text,
  notes text,
  created_at timestamptz not null default now(),
  unique (venue_id, contact_id)
);
