-- Get a single flight by ID
create or replace function get_flight_by_id(p_flight_id uuid)
returns advancing_flights
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flight advancing_flights;
  v_show_id uuid;
begin
  -- First get the show_id to check access
  select show_id into v_show_id from advancing_flights where id = p_flight_id;
  
  if v_show_id is null then
    return null;
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  select * into v_flight from advancing_flights where id = p_flight_id;
  
  return v_flight;
end;
$$;
