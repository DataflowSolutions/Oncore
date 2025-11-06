-- =====================================
-- FINAL DATABASE POLISH MIGRATION
-- =====================================
-- This migration adds the final polish to the database schema:
-- 1. Convert email columns to citext for case-insensitive handling
-- 2. Add unique constraints scoped per organization
-- 3. Add duration tracking to schedule items
-- 4. Add full-text search capabilities
-- 5. Add missing performance indexes
-- 6. Add validation constraints

-- =====================================
-- 1. CONVERT EMAILS TO CITEXT
-- =====================================
-- Ensure citext extension is enabled
CREATE EXTENSION IF NOT EXISTS citext;

-- Convert email columns to citext for case-insensitive email handling
ALTER TABLE contacts ALTER COLUMN email TYPE citext;
ALTER TABLE people ALTER COLUMN email TYPE citext;
ALTER TABLE invitations ALTER COLUMN email TYPE citext;

-- =====================================
-- 2. ADD UNIQUE CONSTRAINTS PER ORG
-- =====================================
-- Prevent duplicate venue names within the same organization
CREATE UNIQUE INDEX IF NOT EXISTS venues_unique_name_per_org 
ON venues (org_id, lower(name), lower(city));

-- Prevent duplicate contact emails within the same organization
CREATE UNIQUE INDEX IF NOT EXISTS contacts_unique_email_per_org 
ON contacts (org_id, lower(email)) 
WHERE email IS NOT NULL;

-- Prevent duplicate people emails within the same organization
CREATE UNIQUE INDEX IF NOT EXISTS people_unique_email_per_org 
ON people (org_id, lower(email)) 
WHERE email IS NOT NULL;

-- =====================================
-- 3. ADD DURATION COLUMN TO SCHEDULE ITEMS
-- =====================================
-- Add generated column to automatically calculate duration in minutes
ALTER TABLE schedule_items
ADD COLUMN IF NOT EXISTS duration_minutes INT 
GENERATED ALWAYS AS (
  CASE 
    WHEN ends_at IS NOT NULL 
    THEN CEIL(EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60.0)
    ELSE NULL
  END
) STORED;

-- Add check constraint to ensure ends_at is after starts_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'schedule_items_time_order_check'
  ) THEN
    ALTER TABLE schedule_items
    ADD CONSTRAINT schedule_items_time_order_check 
    CHECK (ends_at IS NULL OR ends_at >= starts_at);
  END IF;
END $$;

-- =====================================
-- 4. ADD FULL-TEXT SEARCH CAPABILITIES
-- =====================================
-- Add full-text search to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS tsv tsvector 
GENERATED ALWAYS AS (
  to_tsvector('simple', 
    coalesce(name, '') || ' ' || 
    coalesce(company, '') || ' ' || 
    coalesce(city, '')
  )
) STORED;

CREATE INDEX IF NOT EXISTS contacts_tsv_idx 
ON contacts USING gin(tsv);

-- Add full-text search to venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS tsv tsvector 
GENERATED ALWAYS AS (
  to_tsvector('simple', 
    coalesce(name, '') || ' ' || 
    coalesce(city, '') || ' ' || 
    coalesce(address, '')
  )
) STORED;

CREATE INDEX IF NOT EXISTS venues_tsv_idx 
ON venues USING gin(tsv);

-- =====================================
-- 5. ADD MISSING PERFORMANCE INDEXES
-- =====================================
-- Common query patterns for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_org_name 
ON contacts (org_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_contacts_org_company 
ON contacts (org_id, lower(company)) 
WHERE company IS NOT NULL;

-- Common query patterns for venues
CREATE INDEX IF NOT EXISTS idx_venues_org_city 
ON venues (org_id, lower(city));

CREATE INDEX IF NOT EXISTS idx_venues_org_name 
ON venues (org_id, lower(name));

-- Common query patterns for people
CREATE INDEX IF NOT EXISTS idx_people_org_name 
ON people (org_id, lower(name));

-- Activity log queries by action type and time
CREATE INDEX IF NOT EXISTS idx_activity_log_action_time 
ON activity_log (action, org_id, created_at DESC);

-- Schedule items by visibility and date
CREATE INDEX IF NOT EXISTS idx_schedule_items_visibility_date 
ON schedule_items (org_id, visibility, starts_at) 
WHERE visibility IS NOT NULL;

-- Show collaborators by email (for invites)
CREATE INDEX IF NOT EXISTS idx_show_collaborators_email 
ON show_collaborators (lower(email)) 
WHERE email IS NOT NULL;

-- =====================================
-- 6. ADD VALIDATION CONSTRAINTS
-- =====================================
-- Ensure contact emails are valid format
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_email_format_check') THEN
    ALTER TABLE contacts 
    ADD CONSTRAINT contacts_email_format_check 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Ensure people emails are valid format
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'people_email_format_check') THEN
    ALTER TABLE people 
    ADD CONSTRAINT people_email_format_check 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Ensure schedule items have valid priority
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_items_priority_range_check') THEN
    ALTER TABLE schedule_items 
    ADD CONSTRAINT schedule_items_priority_range_check 
    CHECK (priority IS NULL OR (priority >= 0 AND priority <= 100));
  END IF;
END $$;

-- Ensure amounts are non-negative where applicable
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_commissions_amount_check') THEN
    ALTER TABLE contact_commissions 
    ADD CONSTRAINT contact_commissions_amount_check 
    CHECK (amount >= 0);
  END IF;
END $$;

-- =====================================
-- 7. CLEANUP COMMENTS
-- =====================================
-- Add helpful comments for future developers
COMMENT ON COLUMN schedule_items.duration_minutes IS 'Automatically calculated duration between starts_at and ends_at in minutes';
COMMENT ON COLUMN contacts.tsv IS 'Full-text search vector for name, company, and city';
COMMENT ON COLUMN venues.tsv IS 'Full-text search vector for name, city, and address';

-- =====================================
-- 8. STATISTICS FOR QUERY PLANNER
-- =====================================
-- Update statistics for better query planning
ANALYZE contacts;
ANALYZE venues;
ANALYZE people;
ANALYZE schedule_items;
ANALYZE activity_log;

-- =====================================
-- MIGRATION COMPLETE
-- =====================================
