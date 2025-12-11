-- Fix RLS recursion for show_advancing table
-- Create RPC functions with security definer to bypass RLS while enforcing membership

----------------------------------------------------------------------
-- SHOW_ADVANCING RPCs
----------------------------------------------------------------------

-- Get show_advancing for a show
create or replace function get_show_advancing(p_show_id uuid)
returns show_advancing
language sql
security definer
set search_path = public
as $$
  select * from show_advancing
  where show_id = p_show_id
  limit 1;
$$;

-- Create show_advancing
create or replace function create_show_advancing(
  p_show_id uuid,
  p_status text default 'draft',
  p_created_by uuid default null
)
returns show_advancing
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advancing show_advancing;
  v_user_id uuid;
begin
  -- Check access
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  -- Get current user if not provided
  v_user_id := coalesce(p_created_by, auth.uid());

  insert into show_advancing (
    show_id, status, created_by
  ) values (
    p_show_id, p_status, v_user_id
  )
  returning * into v_advancing;

  return v_advancing;
end;
$$;

-- Get or create show_advancing (upsert)
create or replace function get_or_create_show_advancing(
  p_show_id uuid,
  p_status text default 'draft'
)
returns show_advancing
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advancing show_advancing;
begin
  -- Check access
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  -- Use INSERT ... ON CONFLICT to handle race conditions
  insert into show_advancing (show_id, status, created_by)
  values (p_show_id, p_status, auth.uid())
  on conflict (show_id) do update set show_id = excluded.show_id
  returning * into v_advancing;

  return v_advancing;
end;
$$;

-- Update show_advancing
create or replace function update_show_advancing(
  p_show_id uuid,
  p_status text default null,
  p_artist_confirmed boolean default null,
  p_promoter_confirmed boolean default null
)
returns show_advancing
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advancing show_advancing;
begin
  if not has_show_access(p_show_id) then
    raise exception 'Access denied';
  end if;

  update show_advancing set
    status = coalesce(p_status, status),
    artist_confirmed = coalesce(p_artist_confirmed, artist_confirmed),
    promoter_confirmed = coalesce(p_promoter_confirmed, promoter_confirmed)
  where show_id = p_show_id
  returning * into v_advancing;

  return v_advancing;
end;
$$;
