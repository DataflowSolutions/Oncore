-- Align schema with UI popups: contacts/venues/people/advancing + info

-- 1) Contacts: support address field from "Add Contact" popup
alter table if exists contacts
  add column if not exists address text;

-- 2) Venues: support phone + email from "Create New Venue" popup
alter table if exists venues
  add column if not exists phone text,
  add column if not exists email citext;

-- 3) People: support user Settings fields
alter table if exists people
  add column if not exists username citext,
  add column if not exists address text,
  add column if not exists country text,
  add column if not exists timezone text;

-- 4) Advancing: add country to hotel & catering to match UI

alter table if exists advancing_lodging
  add column if not exists country text;

alter table if exists advancing_catering
  add column if not exists country text;

-- 5) Show-level info cards for "Add Info" popup

create table if not exists show_info_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  title text not null,
  description text,
  info_date date,
  status text, -- e.g. 'draft','published','archived' (handled in app)
  image_file_id uuid references files(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists show_info_items_org_idx on show_info_items (org_id);
create index if not exists show_info_items_show_idx on show_info_items (show_id, info_date);

