-- Add country column to advancing_lodging table
-- This enables storing the country for hotels imported from advance sheets

-- Add the country column
alter table advancing_lodging add column if not exists country text;

-- Update create_lodging function to accept country parameter
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

-- Update update_lodging function to accept country parameter
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
