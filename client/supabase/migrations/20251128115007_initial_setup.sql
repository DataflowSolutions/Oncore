-- Initial setup for a clean Supabase/Postgres project
-- Keep this migration minimal: only enable the core extensions we rely on.

create extension if not exists "pgcrypto"; -- provides gen_random_uuid()
create extension if not exists "citext";   -- case-insensitive text (useful for slugs/emails)
