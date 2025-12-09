-- Create guest function for mobile app
create or replace function create_guest(
  p_show_id uuid,
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_guest_count integer default 1,
  p_pass_type text default null,
  p_notes text default null
)
returns show_guestlist
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest show_guestlist;
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  insert into show_guestlist (show_id, name, phone, email, guest_count, pass_type, notes)
  values (p_show_id, p_name, p_phone, p_email, p_guest_count, p_pass_type, p_notes)
  returning * into v_guest;

  return v_guest;
end;
$$;
