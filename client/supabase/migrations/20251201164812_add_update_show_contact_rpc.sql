-- Add RPC function to update a show contact
create or replace function update_show_contact(
  p_show_contact_id uuid,
  p_name text default null,
  p_role text default null,
  p_phone text default null,
  p_email citext default null,
  p_notes text default null
)
returns show_contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_updated show_contacts;
begin
  -- Get org_id
  select org_id
  into v_org_id
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

  -- Update show contact
  update show_contacts
  set
    name = coalesce(p_name, name),
    role = coalesce(p_role, role),
    phone = coalesce(p_phone, phone),
    email = coalesce(p_email, email),
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_show_contact_id
  returning * into v_updated;

  -- If this is a promoter, also update the linked contacts record
  if v_updated.is_promoter and v_updated.contact_id is not null then
    update contacts
    set
      name = coalesce(p_name, contacts.name),
      role = coalesce(p_role, contacts.role),
      phone = coalesce(p_phone, contacts.phone),
      email = coalesce(p_email, contacts.email),
      notes = coalesce(p_notes, contacts.notes)
    where id = v_updated.contact_id;
  end if;

  return v_updated;
end;
$$;
