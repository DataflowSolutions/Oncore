-- Core show + advancing schema (one advancing per show; no advancing sessions)

-- Shows
create table shows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  venue_id uuid references venues(id),
  title text,
  date date not null,
  doors_at timestamptz,
  set_time timestamptz,
  fee numeric,
  fee_currency text,
  status show_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shows_org_idx on shows (org_id, date);

-- People assigned to shows
create table show_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  duty text,
  created_at timestamptz not null default now(),
  unique (show_id, person_id)
);
create index show_assignments_org_idx on show_assignments (org_id);

-- One advancing record per show (top-level metadata)
create table show_advancing (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null unique references shows(id) on delete cascade,
  status text not null default 'draft',
  created_by uuid,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- Schedule items (calendar)
create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  item_type schedule_item_type not null default 'custom',
  visibility schedule_visibility not null default 'all',
  person_id uuid references people(id),
  notes text,
  auto_generated boolean not null default false,
  source text,
  source_ref uuid,
  priority integer default 0,
  created_at timestamptz not null default now()
);
create index schedule_items_show_idx on schedule_items (show_id, starts_at);
create index schedule_items_person_idx on schedule_items (person_id);

-- Flights (arrival/departure) per show/person
create table advancing_flights (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  person_id uuid references people(id),
  direction text not null check (direction in ('arrival', 'departure')),
  airline text,
  flight_number text,
  booking_ref text,
  ticket_number text,
  aircraft_model text,
  passenger_name text,
  depart_airport_code text,
  depart_city text,
  depart_at timestamptz,
  arrival_airport_code text,
  arrival_city text,
  arrival_at timestamptz,
  seat_number text,
  travel_class text,
  notes text,
  source advancing_party not null default 'artist',
  auto_schedule boolean not null default true,
  created_at timestamptz not null default now()
);
create index advancing_flights_show_idx on advancing_flights (show_id);

-- Lodging
create table advancing_lodging (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  person_id uuid references people(id),
  hotel_name text,
  address text,
  city text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  booking_refs text[],
  phone text,
  email text,
  notes text,
  source advancing_party not null default 'artist',
  created_at timestamptz not null default now()
);
create index advancing_lodging_show_idx on advancing_lodging (show_id);

-- Catering
create table advancing_catering (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  provider_name text,
  address text,
  city text,
  service_at timestamptz,
  guest_count integer,
  booking_refs text[],
  phone text,
  email text,
  notes text,
  source advancing_party not null default 'artist',
  created_at timestamptz not null default now()
);
create index advancing_catering_show_idx on advancing_catering (show_id);

-- Team details (grid-style data per person)
create table advancing_team_details (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  rooming text,
  luggage text,
  visa text,
  passport text,
  credentials text,
  notes text,
  created_at timestamptz not null default now(),
  unique (show_id, person_id)
);

-- Promoter-side requirements (one row per show)
create table promoter_requirements (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null unique references shows(id) on delete cascade,
  catering_notes text,
  accommodation_notes text,
  venue_capacity text,
  soundcheck_notes text,
  load_in_out_notes text,
  running_order text,
  backstage_meals text,
  green_room text,
  pa_monitors text,
  lighting text,
  backline text,
  payment_status text,
  merchandising text,
  venue_contact text,
  source_notes text,
  created_at timestamptz not null default now()
);

-- Transfers (multiple rows per show)
create table promoter_transfers (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  from_location text,
  from_time timestamptz,
  to_location text,
  to_time timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index promoter_transfers_show_idx on promoter_transfers (show_id);

-- Advancing documents (per party per show)
create table advancing_documents (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  party advancing_party not null,
  label text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index advancing_documents_show_idx on advancing_documents (show_id);

-- File metadata (shared by advancing + ingestion)
create table files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid references shows(id) on delete cascade,
  advancing_document_id uuid references advancing_documents(id) on delete cascade,
  advancing_ref text,
  storage_path text not null,
  content_type text,
  original_name text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index files_org_idx on files (org_id);
create index files_show_idx on files (show_id);

-- Notes / comments tied to advancing records
create table advancing_notes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  scope text not null, -- e.g., 'flight','lodging','catering','promoter','general'
  reference_id uuid,
  body text not null,
  author_id uuid,
  author_name text,
  created_at timestamptz not null default now()
);
create index advancing_notes_show_idx on advancing_notes (show_id);
