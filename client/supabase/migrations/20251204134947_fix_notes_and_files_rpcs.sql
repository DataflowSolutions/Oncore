-- Fix create_or_update_notes to work without unique constraint
-- The advancing_notes table doesn't have a unique constraint on (show_id, scope)
-- so we can't use ON CONFLICT. Instead, we SELECT first, then UPDATE or INSERT.

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

-- Fix create_file to use actual table column names
-- The files table uses: storage_path, original_name, content_type, org_id
-- NOT: file_name, file_url, file_type, notes

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
