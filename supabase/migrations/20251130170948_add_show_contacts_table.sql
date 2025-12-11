-- Show contacts table
-- Stores key contacts for a specific show (venue manager, production manager, etc.)
-- Can optionally sync to the main contacts table if marked as a promoter

create table show_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email citext,
  is_promoter boolean not null default false,
  contact_id uuid references contacts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index show_contacts_org_idx on show_contacts (org_id);
create index show_contacts_show_idx on show_contacts (show_id);
create index show_contacts_contact_idx on show_contacts (contact_id);

-- Enable RLS
alter table show_contacts enable row level security;

-- RLS policies
create policy "Users can view show contacts for their org"
  on show_contacts for select
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = show_contacts.org_id
        and org_members.user_id = auth.uid()
    )
  );

create policy "Users can insert show contacts for their org"
  on show_contacts for insert
  with check (
    exists (
      select 1 from org_members
      where org_members.org_id = show_contacts.org_id
        and org_members.user_id = auth.uid()
    )
  );

create policy "Users can update show contacts for their org"
  on show_contacts for update
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = show_contacts.org_id
        and org_members.user_id = auth.uid()
    )
  );

create policy "Users can delete show contacts for their org"
  on show_contacts for delete
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = show_contacts.org_id
        and org_members.user_id = auth.uid()
    )
  );

-- RPC to get show contacts with venues for promoters
create or replace function get_show_contacts(p_show_id uuid)
returns table (
  id uuid,
  org_id uuid,
  show_id uuid,
  name text,
  role text,
  phone text,
  email citext,
  is_promoter boolean,
  contact_id uuid,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  venues jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    sc.id,
    sc.org_id,
    sc.show_id,
    sc.name,
    sc.role,
    sc.phone,
    sc.email,
    sc.is_promoter,
    sc.contact_id,
    sc.notes,
    sc.created_at,
    sc.updated_at,
    case 
      when sc.is_promoter and sc.contact_id is not null then
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', v.id,
                'name', v.name,
                'city', v.city,
                'country', v.country,
                'is_primary', vc.is_primary
              )
            )
            from venue_contacts vc
            join venues v on v.id = vc.venue_id
            where vc.contact_id = sc.contact_id
          ),
          '[]'::jsonb
        )
      else '[]'::jsonb
    end as venues
  from show_contacts sc
  where sc.show_id = p_show_id
  order by sc.created_at asc;
$$;

-- RPC to save a show contact
-- If is_promoter is true, also creates/updates entry in contacts table
create or replace function save_show_contact(
  p_show_id uuid,
  p_name text,
  p_role text,
  p_phone text,
  p_email citext,
  p_is_promoter boolean,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_show_contact_id uuid;
  v_contact_id uuid;
  v_city text;
  v_venue_id uuid;
begin
  -- Get org_id, city, and venue_id from the show
  select s.org_id, v.city, s.venue_id
  into v_org_id, v_city, v_venue_id
  from shows s
  left join venues v on v.id = s.venue_id
  where s.id = p_show_id;

  if v_org_id is null then
    raise exception 'Show not found';
  end if;

  -- Check user has access
  if not exists (
      select 1 from org_members
    where org_id = v_org_id
      and user_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;

  -- If is_promoter, create/update in contacts table
  if p_is_promoter then
    -- Check if contact already exists with same email or phone
    select id into v_contact_id
    from contacts
    where org_id = v_org_id
      and contact_type = 'promoter'
      and (
        (p_email is not null and email = p_email)
        or (p_phone is not null and phone = p_phone)
      )
    limit 1;

    if v_contact_id is not null then
      -- Update existing contact
      update contacts
      set
        name = p_name,
        phone = coalesce(p_phone, contacts.phone),
        email = coalesce(p_email, contacts.email),
        role = coalesce(p_role, contacts.role),
        city = coalesce(v_city, contacts.city),
        notes = coalesce(p_notes, contacts.notes)
      where id = v_contact_id;
    else
      -- Create new contact
      insert into contacts (
        org_id,
        name,
        email,
        phone,
        role,
        city,
        contact_type,
        notes
      ) values (
        v_org_id,
        p_name,
        p_email,
        p_phone,
        p_role,
        v_city,
        'promoter',
        p_notes
      )
      returning id into v_contact_id;
    end if;

    -- Link promoter to venue if venue exists and not already linked
    if v_venue_id is not null and v_contact_id is not null then
      insert into venue_contacts (venue_id, contact_id, is_primary)
      values (v_venue_id, v_contact_id, false)
      on conflict (venue_id, contact_id) do nothing;
    end if;
  end if;

  -- Create show_contact record
  insert into show_contacts (
    org_id,
    show_id,
    name,
    role,
    phone,
    email,
    is_promoter,
    contact_id,
    notes
  ) values (
    v_org_id,
    p_show_id,
    p_name,
    p_role,
    p_phone,
    p_email,
    p_is_promoter,
    v_contact_id,
    p_notes
  )
  returning id into v_show_contact_id;

  return v_show_contact_id;
end;
$$;

-- RPC to delete a show contact
-- If contact is linked to contacts table, optionally keeps the contacts entry
create or replace function delete_show_contact(
  p_show_contact_id uuid,
  p_delete_from_contacts boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_contact_id uuid;
begin
  -- Get org_id and contact_id
  select org_id, contact_id
  into v_org_id, v_contact_id
  from show_contacts
  where id = p_show_contact_id;

  if v_org_id is null then
    raise exception 'Show contact not found';
  end if;

  -- Check user has access
  if not exists (
      select 1 from org_members
    where org_id = v_org_id
      and user_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;

  -- Delete show contact
  delete from show_contacts where id = p_show_contact_id;

  -- Optionally delete from contacts table
  if p_delete_from_contacts and v_contact_id is not null then
    delete from contacts where id = v_contact_id;
  end if;
end;
$$;
