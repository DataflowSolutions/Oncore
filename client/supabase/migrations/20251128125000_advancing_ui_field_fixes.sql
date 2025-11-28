-- Add missing advancing fields used by UI popups (lodging room type; flight gate/boarding details)

alter table if exists advancing_lodging
  add column if not exists room_type text;

alter table if exists advancing_flights
  add column if not exists gate text,
  add column if not exists boarding_at timestamptz,
  add column if not exists boarding_group text,
  add column if not exists boarding_sequence text;
