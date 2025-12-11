-- Fix schedule_items RLS policy to avoid recursion
-- The table has org_id, so we can check membership directly instead of going through shows

-- Drop old policy
do $$ begin
  drop policy schedule_items_rw on schedule_items;
exception when undefined_object then null; end $$;

-- Create new policy using direct org_id check
create policy schedule_items_rw on schedule_items for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- Also fix advancing_flights, advancing_lodging, advancing_catering, advancing_team_details
-- These tables also have show_id and might cause similar recursion issues
-- Let's add org_id to these tables if they don't have it, or create an RPC for them

-- Create RPC for creating schedule items to bypass RLS entirely with membership check
create or replace function create_schedule_item(
  p_org_id uuid,
  p_show_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_location text default null,
  p_item_type schedule_item_type default 'custom',
  p_visibility schedule_visibility default 'all',
  p_person_id uuid default null,
  p_notes text default null,
  p_auto_generated boolean default false,
  p_source text default null,
  p_source_ref uuid default null,
  p_priority integer default 0
)
returns schedule_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item schedule_items;
begin
  -- Check membership
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;

  insert into schedule_items (
    org_id, show_id, title, starts_at, ends_at, location,
    item_type, visibility, person_id, notes, auto_generated, source, source_ref, priority
  ) values (
    p_org_id, p_show_id, p_title, p_starts_at, p_ends_at, p_location,
    p_item_type, p_visibility, p_person_id, p_notes, p_auto_generated, p_source, p_source_ref, p_priority
  )
  returning * into v_item;

  return v_item;
end;
$$;

-- Create RPC for updating schedule items
create or replace function update_schedule_item(
  p_item_id uuid,
  p_title text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_location text default null,
  p_item_type schedule_item_type default null,
  p_visibility schedule_visibility default null,
  p_person_id uuid default null,
  p_notes text default null,
  p_priority integer default null
)
returns schedule_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item schedule_items;
  v_org_id uuid;
begin
  -- Get org_id from the item
  select org_id into v_org_id from schedule_items where id = p_item_id;
  
  if v_org_id is null then
    raise exception 'Schedule item not found';
  end if;
  
  -- Check membership
  if not is_org_member(v_org_id) then
    raise exception 'Access denied';
  end if;

  update schedule_items set
    title = coalesce(p_title, title),
    starts_at = coalesce(p_starts_at, starts_at),
    ends_at = coalesce(p_ends_at, ends_at),
    location = coalesce(p_location, location),
    item_type = coalesce(p_item_type, item_type),
    visibility = coalesce(p_visibility, visibility),
    person_id = coalesce(p_person_id, person_id),
    notes = coalesce(p_notes, notes),
    priority = coalesce(p_priority, priority)
  where id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

-- Create RPC for deleting schedule items
create or replace function delete_schedule_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Get org_id from the item
  select org_id into v_org_id from schedule_items where id = p_item_id;
  
  if v_org_id is null then
    return false;
  end if;
  
  -- Check membership
  if not is_org_member(v_org_id) then
    raise exception 'Access denied';
  end if;

  delete from schedule_items where id = p_item_id;
  return true;
end;
$$;

-- Create RPC for getting schedule items for a show
create or replace function get_schedule_items_for_show(p_show_id uuid)
returns table (
  id uuid,
  org_id uuid,
  show_id uuid,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  item_type schedule_item_type,
  visibility schedule_visibility,
  person_id uuid,
  notes text,
  auto_generated boolean,
  source text,
  source_ref uuid,
  priority integer,
  created_at timestamptz,
  person_name text
)
language sql
security definer
set search_path = public
as $$
  select 
    si.id,
    si.org_id,
    si.show_id,
    si.title,
    si.starts_at,
    si.ends_at,
    si.location,
    si.item_type,
    si.visibility,
    si.person_id,
    si.notes,
    si.auto_generated,
    si.source,
    si.source_ref,
    si.priority,
    si.created_at,
    p.name as person_name
  from schedule_items si
  left join people p on p.id = si.person_id
  where si.show_id = p_show_id
  order by si.priority asc, si.starts_at asc;
$$;
