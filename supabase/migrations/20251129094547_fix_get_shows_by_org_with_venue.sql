-- Fix get_shows_by_org to return venue data including city and country
-- This replaces the simple function that only returned shows data

-- First drop the existing function to allow changing the return type
drop function if exists get_shows_by_org(uuid);

create or replace function get_shows_by_org(p_org_id uuid)
returns table (
  id uuid,
  org_id uuid,
  title text,
  date date,
  venue_id uuid,
  set_time timestamptz,
  doors_at time,
  notes text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  -- Venue fields
  venue_name text,
  venue_city text,
  venue_country text,
  venue_address text,
  venue_capacity integer
)
language sql
security definer
set search_path = public
as $$
  select 
    s.id,
    s.org_id,
    s.title,
    s.date,
    s.venue_id,
    s.set_time,
    s.doors_at,
    s.notes,
    s.status,
    s.created_at,
    s.updated_at,
    -- Venue fields (will be null if no venue)
    v.name as venue_name,
    v.city as venue_city,
    v.country as venue_country,
    v.address as venue_address,
    v.capacity as venue_capacity
  from shows s
  left join venues v on v.id = s.venue_id
  where s.org_id = p_org_id 
  order by s.date desc;
$$;
