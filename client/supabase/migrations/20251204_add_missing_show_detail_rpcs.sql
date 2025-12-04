-- Add missing RPC functions for show details (guestlist, files, notes, assignments)
-- ============================================================================

-- CREATE ASSIGNMENT FUNCTION
-- ============================================================================
create or replace function create_assignment(
  p_org_id uuid,
  p_show_id uuid,
  p_person_id uuid,
  p_duty text default null
)
returns show_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment show_assignments;
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;

  insert into show_assignments (org_id, show_id, person_id, duty)
  values (p_org_id, p_show_id, p_person_id, p_duty)
  returning * into v_assignment;

  return v_assignment;
end;
$$;

-- DELETE ASSIGNMENT FUNCTION
-- ============================================================================
create or replace function delete_assignment(
  p_org_id uuid,
  p_show_id uuid,
  p_person_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;

  delete from show_assignments
  where org_id = p_org_id
    and show_id = p_show_id
    and person_id = p_person_id;

  return true;
end;
$$;

-- DELETE FILE FUNCTION
-- ============================================================================
create or replace function delete_file(
  p_file_id uuid,
  p_show_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  delete from files
  where id = p_file_id
    and show_id = p_show_id;

  return true;
end;
$$;

-- DELETE GUEST FUNCTION
-- ============================================================================
create or replace function delete_guest(
  p_guest_id uuid,
  p_show_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  delete from show_guestlist
  where id = p_guest_id
    and show_id = p_show_id;

  return true;
end;
$$;

-- CREATE GUESTLIST FUNCTION
-- ============================================================================
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

-- UPDATE GUESTLIST FUNCTION
-- ============================================================================
create or replace function update_guest(
  p_guest_id uuid,
  p_name text default null,
  p_phone text default null,
  p_email text default null,
  p_guest_count integer default null,
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
  v_show_id uuid;
begin
  -- Get the show_id from the guest
  select show_id into v_show_id from show_guestlist where id = p_guest_id;
  
  if v_show_id is null then
    raise exception 'Guest not found';
  end if;

  if not has_show_access(v_show_id) then
    raise exception 'Access denied';
  end if;

  update show_guestlist
  set 
    name = coalesce(p_name, name),
    phone = coalesce(p_phone, phone),
    email = coalesce(p_email, email),
    guest_count = coalesce(p_guest_count, guest_count),
    pass_type = coalesce(p_pass_type, pass_type),
    notes = coalesce(p_notes, notes)
  where id = p_guest_id
  returning * into v_guest;

  return v_guest;
end;
$$;

-- CREATE FILES FUNCTION
-- ============================================================================
create or replace function create_file(
  p_org_id uuid,
  p_show_id uuid,
  p_storage_path text,
  p_original_name text,
  p_content_type text default null,
  p_size_bytes bigint default null
)
returns files
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file files;
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  insert into files (org_id, show_id, storage_path, original_name, content_type, size_bytes)
  values (p_org_id, p_show_id, p_storage_path, p_original_name, p_content_type, p_size_bytes)
  returning * into v_file;

  return v_file;
end;
$$;

-- CREATE NOTES FUNCTION
-- ============================================================================
create or replace function create_or_update_notes(
  p_show_id uuid,
  p_scope text default 'general',
  p_body text default null
)
returns advancing_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note advancing_notes;
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  -- Check if a note with this scope already exists
  select * into v_note
  from advancing_notes
  where show_id = p_show_id and scope = p_scope
  limit 1;

  if v_note.id is not null then
    -- Update existing note
    update advancing_notes
    set body = p_body
    where id = v_note.id
    returning * into v_note;
  else
    -- Insert new note
    insert into advancing_notes (show_id, scope, body)
    values (p_show_id, p_scope, p_body)
    returning * into v_note;
  end if;

  return v_note;
end;
$$;

-- GET GUESTLIST FUNCTION
-- ============================================================================
create or replace function get_show_guestlist(p_show_id uuid)
returns setof show_guestlist
language sql
security definer
set search_path = public
as $$
  select * from show_guestlist
  where show_id = p_show_id
  order by name asc;
$$;

-- GET FILES FUNCTION
-- ============================================================================
create or replace function get_show_files(p_show_id uuid)
returns setof files
language sql
security definer
set search_path = public
as $$
  select * from files
  where show_id = p_show_id
  order by created_at desc;
$$;

-- GET NOTES FUNCTION
-- ============================================================================
create or replace function get_show_notes(p_show_id uuid)
returns setof advancing_notes
language sql
security definer
set search_path = public
as $$
  select * from advancing_notes
  where show_id = p_show_id
  order by scope asc;
$$;
