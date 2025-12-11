-- Add show_costs table for tracking show-related expenses
-- Fee is already on shows table (fee, fee_currency)
-- This table tracks individual cost line items

-- Show Costs table
create table if not exists show_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index show_costs_org_idx on show_costs (org_id);
create index show_costs_show_idx on show_costs (show_id);

-- Add fee_paid percentage to shows table (for "50% paid" type display)
alter table shows add column if not exists fee_paid_percent integer default 0;

-- Enable RLS
alter table show_costs enable row level security;

-- RLS Policy (same pattern as other tables)
create policy "show_costs_org_access" on show_costs
  for all
  using (is_org_member(org_id));

-- RPC function to get costs for a show
create or replace function get_show_costs(p_show_id uuid)
returns setof show_costs
language sql
security definer
set search_path = public
as $$
  select * from show_costs where show_id = p_show_id order by created_at;
$$;

-- RPC function to create a cost
create or replace function create_show_cost(
  p_org_id uuid,
  p_show_id uuid,
  p_name text,
  p_amount numeric,
  p_currency text default 'USD',
  p_notes text default null
)
returns show_costs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost show_costs;
begin
  if not is_org_member(p_org_id) then
    raise exception 'Access denied';
  end if;
  insert into show_costs (org_id, show_id, name, amount, currency, notes)
  values (p_org_id, p_show_id, p_name, p_amount, p_currency, p_notes)
  returning * into v_cost;
  return v_cost;
end;
$$;

-- RPC function to update a cost
create or replace function update_show_cost(
  p_cost_id uuid,
  p_name text default null,
  p_amount numeric default null,
  p_currency text default null,
  p_notes text default null
)
returns show_costs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost show_costs;
  v_org_id uuid;
begin
  select org_id into v_org_id from show_costs where id = p_cost_id;
  if not is_org_member(v_org_id) then
    raise exception 'Access denied';
  end if;
  update show_costs set
    name = coalesce(p_name, name),
    amount = coalesce(p_amount, amount),
    currency = coalesce(p_currency, currency),
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_cost_id
  returning * into v_cost;
  return v_cost;
end;
$$;

-- RPC function to delete a cost
create or replace function delete_show_cost(p_cost_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from show_costs where id = p_cost_id;
  if not is_org_member(v_org_id) then
    raise exception 'Access denied';
  end if;
  delete from show_costs where id = p_cost_id;
  return true;
end;
$$;

-- RPC function to update show fee info
create or replace function update_show_fee(
  p_show_id uuid,
  p_fee numeric default null,
  p_fee_currency text default null,
  p_fee_paid_percent integer default null
)
returns shows
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show shows;
  v_org_id uuid;
begin
  select org_id into v_org_id from shows where id = p_show_id;
  if not is_org_member(v_org_id) then
    raise exception 'Access denied';
  end if;
  update shows set
    fee = coalesce(p_fee, fee),
    fee_currency = coalesce(p_fee_currency, fee_currency),
    fee_paid_percent = coalesce(p_fee_paid_percent, fee_paid_percent),
    updated_at = now()
  where id = p_show_id
  returning * into v_show;
  return v_show;
end;
$$;
