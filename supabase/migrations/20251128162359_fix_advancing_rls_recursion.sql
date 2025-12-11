-- Fix RLS recursion for advancing_lodging, advancing_flights, advancing_catering
-- Create RPC functions with security definer to bypass RLS while enforcing membership

-- Helper function to check if user has access to a show via org membership
create or replace function has_show_access(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from shows s
    join org_members om on om.org_id = s.org_id
    where s.id = p_show_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

----------------------------------------------------------------------
-- LODGING RPCs
----------------------------------------------------------------------

-- Get lodging for a show
create or replace function get_show_lodging(p_show_id uuid)
returns setof advancing_lodging
language sql
security definer
set search_path = public
as $$
  select * from advancing_lodging
  where show_id = p_show_id
  order by created_at asc;
$$;

-- Get single lodging by show and optionally person
create or replace function get_lodging_by_show_person(p_show_id uuid, p_person_id uuid default null)
returns advancing_lodging
language sql
security definer
set search_path = public
as $$
  select * from advancing_lodging
  where show_id = p_show_id
    and (
      (p_person_id is null and person_id is null) or
      (p_person_id is not null and person_id = p_person_id)
    )
  limit 1;
$$;

-- Create lodging
create or replace function create_lodging(
  p_show_id uuid,
  p_person_id uuid default null,
  p_hotel_name text default null,
  p_address text default null,
  p_city text default null,
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
    show_id, person_id, hotel_name, address, city,
    check_in_at, check_out_at, booking_refs, phone, email, notes, source
  ) values (
    p_show_id, p_person_id, p_hotel_name, p_address, p_city,
    p_check_in_at, p_check_out_at, p_booking_refs, p_phone, p_email, p_notes, p_source
  )
  returning * into v_lodging;

  return v_lodging;
end;
$$;

-- Update lodging
create or replace function update_lodging(
  p_lodging_id uuid,
  p_hotel_name text default null,
  p_address text default null,
  p_city text default null,
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

-- Delete lodging
create or replace function delete_lodging(p_lodging_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_id uuid;
begin
  select show_id into v_show_id from advancing_lodging where id = p_lodging_id;
  
  if v_show_id is null then
    return false;
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  delete from advancing_lodging where id = p_lodging_id;
  return true;
end;
$$;

----------------------------------------------------------------------
-- FLIGHTS RPCs
----------------------------------------------------------------------

-- Get flights for a show
create or replace function get_show_flights(p_show_id uuid)
returns setof advancing_flights
language sql
security definer
set search_path = public
as $$
  select * from advancing_flights
  where show_id = p_show_id
  order by depart_at asc nulls last, created_at asc;
$$;

-- Create flight
create or replace function create_flight(
  p_show_id uuid,
  p_direction text,
  p_person_id uuid default null,
  p_airline text default null,
  p_flight_number text default null,
  p_booking_ref text default null,
  p_ticket_number text default null,
  p_aircraft_model text default null,
  p_passenger_name text default null,
  p_depart_airport_code text default null,
  p_depart_city text default null,
  p_depart_at timestamptz default null,
  p_arrival_airport_code text default null,
  p_arrival_city text default null,
  p_arrival_at timestamptz default null,
  p_seat_number text default null,
  p_travel_class text default null,
  p_notes text default null,
  p_source advancing_party default 'artist',
  p_auto_schedule boolean default true
)
returns advancing_flights
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flight advancing_flights;
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  insert into advancing_flights (
    show_id, person_id, direction, airline, flight_number, booking_ref,
    ticket_number, aircraft_model, passenger_name,
    depart_airport_code, depart_city, depart_at,
    arrival_airport_code, arrival_city, arrival_at,
    seat_number, travel_class, notes, source, auto_schedule
  ) values (
    p_show_id, p_person_id, p_direction, p_airline, p_flight_number, p_booking_ref,
    p_ticket_number, p_aircraft_model, p_passenger_name,
    p_depart_airport_code, p_depart_city, p_depart_at,
    p_arrival_airport_code, p_arrival_city, p_arrival_at,
    p_seat_number, p_travel_class, p_notes, p_source, p_auto_schedule
  )
  returning * into v_flight;

  return v_flight;
end;
$$;

-- Update flight
create or replace function update_flight(
  p_flight_id uuid,
  p_direction text default null,
  p_person_id uuid default null,
  p_airline text default null,
  p_flight_number text default null,
  p_booking_ref text default null,
  p_ticket_number text default null,
  p_aircraft_model text default null,
  p_passenger_name text default null,
  p_depart_airport_code text default null,
  p_depart_city text default null,
  p_depart_at timestamptz default null,
  p_arrival_airport_code text default null,
  p_arrival_city text default null,
  p_arrival_at timestamptz default null,
  p_seat_number text default null,
  p_travel_class text default null,
  p_notes text default null,
  p_source advancing_party default null,
  p_auto_schedule boolean default null
)
returns advancing_flights
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flight advancing_flights;
  v_show_id uuid;
begin
  select show_id into v_show_id from advancing_flights where id = p_flight_id;
  
  if v_show_id is null then
    raise exception 'Flight not found';
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  update advancing_flights set
    direction = coalesce(p_direction, direction),
    person_id = coalesce(p_person_id, person_id),
    airline = coalesce(p_airline, airline),
    flight_number = coalesce(p_flight_number, flight_number),
    booking_ref = coalesce(p_booking_ref, booking_ref),
    ticket_number = coalesce(p_ticket_number, ticket_number),
    aircraft_model = coalesce(p_aircraft_model, aircraft_model),
    passenger_name = coalesce(p_passenger_name, passenger_name),
    depart_airport_code = coalesce(p_depart_airport_code, depart_airport_code),
    depart_city = coalesce(p_depart_city, depart_city),
    depart_at = coalesce(p_depart_at, depart_at),
    arrival_airport_code = coalesce(p_arrival_airport_code, arrival_airport_code),
    arrival_city = coalesce(p_arrival_city, arrival_city),
    arrival_at = coalesce(p_arrival_at, arrival_at),
    seat_number = coalesce(p_seat_number, seat_number),
    travel_class = coalesce(p_travel_class, travel_class),
    notes = coalesce(p_notes, notes),
    source = coalesce(p_source, source),
    auto_schedule = coalesce(p_auto_schedule, auto_schedule)
  where id = p_flight_id
  returning * into v_flight;

  return v_flight;
end;
$$;

-- Delete flight
create or replace function delete_flight(p_flight_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_id uuid;
begin
  select show_id into v_show_id from advancing_flights where id = p_flight_id;
  
  if v_show_id is null then
    return false;
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  delete from advancing_flights where id = p_flight_id;
  return true;
end;
$$;

----------------------------------------------------------------------
-- CATERING RPCs
----------------------------------------------------------------------

-- Get catering for a show
create or replace function get_show_catering(p_show_id uuid)
returns setof advancing_catering
language sql
security definer
set search_path = public
as $$
  select * from advancing_catering
  where show_id = p_show_id
  order by service_at asc nulls last, created_at asc;
$$;

-- Create catering
create or replace function create_catering(
  p_show_id uuid,
  p_provider_name text default null,
  p_address text default null,
  p_city text default null,
  p_service_at timestamptz default null,
  p_guest_count integer default null,
  p_booking_refs text[] default null,
  p_phone text default null,
  p_email text default null,
  p_notes text default null,
  p_source advancing_party default 'artist'
)
returns advancing_catering
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catering advancing_catering;
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  insert into advancing_catering (
    show_id, provider_name, address, city, service_at,
    guest_count, booking_refs, phone, email, notes, source
  ) values (
    p_show_id, p_provider_name, p_address, p_city, p_service_at,
    p_guest_count, p_booking_refs, p_phone, p_email, p_notes, p_source
  )
  returning * into v_catering;

  return v_catering;
end;
$$;

-- Update catering
create or replace function update_catering(
  p_catering_id uuid,
  p_provider_name text default null,
  p_address text default null,
  p_city text default null,
  p_service_at timestamptz default null,
  p_guest_count integer default null,
  p_booking_refs text[] default null,
  p_phone text default null,
  p_email text default null,
  p_notes text default null,
  p_source advancing_party default null
)
returns advancing_catering
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catering advancing_catering;
  v_show_id uuid;
begin
  select show_id into v_show_id from advancing_catering where id = p_catering_id;
  
  if v_show_id is null then
    raise exception 'Catering not found';
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  update advancing_catering set
    provider_name = coalesce(p_provider_name, provider_name),
    address = coalesce(p_address, address),
    city = coalesce(p_city, city),
    service_at = coalesce(p_service_at, service_at),
    guest_count = coalesce(p_guest_count, guest_count),
    booking_refs = coalesce(p_booking_refs, booking_refs),
    phone = coalesce(p_phone, phone),
    email = coalesce(p_email, email),
    notes = coalesce(p_notes, notes),
    source = coalesce(p_source, source)
  where id = p_catering_id
  returning * into v_catering;

  return v_catering;
end;
$$;

-- Delete catering
create or replace function delete_catering(p_catering_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_id uuid;
begin
  select show_id into v_show_id from advancing_catering where id = p_catering_id;
  
  if v_show_id is null then
    return false;
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  delete from advancing_catering where id = p_catering_id;
  return true;
end;
$$;
