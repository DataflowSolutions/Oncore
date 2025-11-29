-- Fix get_show_team to accept optional party_type parameter
drop function if exists get_show_team(uuid);

create or replace function get_show_team(p_show_id uuid, p_party_type text default null)
returns table (
  id uuid,
  name text,
  email citext,
  phone text,
  member_type member_type,
  duty text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.email, p.phone, p.member_type, sa.duty
  from show_assignments sa
  join people p on p.id = sa.person_id
  where sa.show_id = p_show_id
    and (p_party_type is null 
         or (p_party_type = 'from_us' and p.member_type in ('crew', 'management', 'vendor', 'other'))
         or (p_party_type = 'from_you' and p.member_type = 'artist'));
$$;

-- Fix get_available_people to accept optional party_type parameter
drop function if exists get_available_people(uuid);

create or replace function get_available_people(p_org_id uuid, p_party_type text default null)
returns table (
  id uuid,
  name text,
  email citext,
  phone text,
  member_type member_type
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.email, p.phone, p.member_type
  from people p
  where p.org_id = p_org_id
    and (p_party_type is null 
         or (p_party_type = 'from_us' and p.member_type in ('crew', 'management', 'vendor', 'other'))
         or (p_party_type = 'from_you' and p.member_type = 'artist'));
$$;
