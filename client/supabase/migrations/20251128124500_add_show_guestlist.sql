-- Add guestlist support to match UI popup

create table if not exists show_guestlist (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  phone text,
  email citext,
  guest_count integer not null default 1,
  pass_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists show_guestlist_show_idx on show_guestlist (show_id);
