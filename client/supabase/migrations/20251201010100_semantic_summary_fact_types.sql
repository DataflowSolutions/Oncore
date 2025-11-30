-- Extend import_fact_type with summary fact types for catering, transfers, and technical riders
set check_function_bodies = off;

do $$
begin
  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'catering_summary'
  ) then
    alter type import_fact_type add value 'catering_summary';
  end if;

  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'transfer_summary'
  ) then
    alter type import_fact_type add value 'transfer_summary';
  end if;

  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'ground_transport_summary'
  ) then
    alter type import_fact_type add value 'ground_transport_summary';
  end if;

  if not exists (
    select 1 from pg_enum e
    where e.enumtypid = 'import_fact_type'::regtype
      and e.enumlabel = 'technical_equipment_summary'
  ) then
    alter type import_fact_type add value 'technical_equipment_summary';
  end if;
end;
$$;
