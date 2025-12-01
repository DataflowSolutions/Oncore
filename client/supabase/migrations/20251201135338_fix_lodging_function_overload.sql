-- Fix function overloading issue for create_lodging and update_lodging
-- The previous migration created new overloaded functions instead of replacing them
-- because the parameter signatures were different. This drops the old versions.

-- Drop the old create_lodging function (without p_country parameter)
drop function if exists create_lodging(
  uuid,           -- p_show_id
  uuid,           -- p_person_id
  text,           -- p_hotel_name
  text,           -- p_address
  text,           -- p_city
  timestamptz,    -- p_check_in_at
  timestamptz,    -- p_check_out_at
  text[],         -- p_booking_refs
  text,           -- p_phone
  text,           -- p_email
  text,           -- p_notes
  advancing_party -- p_source
);

-- Drop the old update_lodging function (without p_country parameter)
drop function if exists update_lodging(
  uuid,           -- p_lodging_id
  text,           -- p_hotel_name
  text,           -- p_address
  text,           -- p_city
  timestamptz,    -- p_check_in_at
  timestamptz,    -- p_check_out_at
  text[],         -- p_booking_refs
  text,           -- p_phone
  text,           -- p_email
  text,           -- p_notes
  advancing_party -- p_source
);

-- Recreate create_lodging with country parameter (ensures it exists)
create or replace function create_lodging(
  p_show_id uuid,
  p_person_id uuid default null,
  p_hotel_name text default null,
  p_address text default null,
  p_city text default null,
  p_country text default null,
  p_check_in_at timestamptz default null,
  p_check_out_at timestamptz default null,
  p_booking_refs text[] default null,
  p_phone text default null,
  p_email text default null,
  p_notes text default null,
  p_source advancing_party default 'artist'
)
returns advancing_lodging
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lodging advancing_lodging;
begin
  -- Check access
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  insert into advancing_lodging (
    show_id, person_id, hotel_name, address, city, country,
    check_in_at, check_out_at, booking_refs, phone, email, notes, source
  ) values (
    p_show_id, p_person_id, p_hotel_name, p_address, p_city, p_country,
    p_check_in_at, p_check_out_at, p_booking_refs, p_phone, p_email, p_notes, p_source
  )
  returning * into v_lodging;

  return v_lodging;
end;
$$;

-- Recreate update_lodging with country parameter (ensures it exists)
create or replace function update_lodging(
  p_lodging_id uuid,
  p_hotel_name text default null,
  p_address text default null,
  p_city text default null,
  p_country text default null,
  p_check_in_at timestamptz default null,
  p_check_out_at timestamptz default null,
  p_booking_refs text[] default null,
  p_phone text default null,
  p_email text default null,
  p_notes text default null,
  p_source advancing_party default null
)
returns advancing_lodging
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lodging advancing_lodging;
  v_show_id uuid;
begin
  -- Get show_id for access check
  select show_id into v_show_id from advancing_lodging where id = p_lodging_id;
  
  if v_show_id is null then
    raise exception 'Lodging not found';
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  update advancing_lodging set
    hotel_name = coalesce(p_hotel_name, hotel_name),
    address = coalesce(p_address, address),
    city = coalesce(p_city, city),
    country = coalesce(p_country, country),
    check_in_at = coalesce(p_check_in_at, check_in_at),
    check_out_at = coalesce(p_check_out_at, check_out_at),
    booking_refs = coalesce(p_booking_refs, booking_refs),
    phone = coalesce(p_phone, phone),
    email = coalesce(p_email, email),
    notes = coalesce(p_notes, notes),
    source = coalesce(p_source, source)
  where id = p_lodging_id
  returning * into v_lodging;

  return v_lodging;
end;
$$;
