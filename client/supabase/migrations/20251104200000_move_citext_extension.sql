-- Migration: Move citext extension from public to extensions schema
-- Created: 2025-11-04
-- Description: Moves citext extension to a dedicated extensions schema for better security
-- Note: This migration is idempotent and safe to run multiple times

-- ============================================================================
-- 1. Create extensions schema if it doesn't exist
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;

-- ============================================================================
-- 2. Move citext extension to extensions schema (wrapped in DO block for error handling)
-- ============================================================================
DO $$ 
BEGIN
  -- Only attempt to move if citext is not already in extensions schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'citext' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION citext SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- In local development, we might not have permissions to move extensions
    -- This is fine - citext in public schema works, just not as clean
    RAISE NOTICE 'Could not move citext extension (insufficient privileges). This is OK for local development.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not move citext extension: %', SQLERRM;
END $$;

-- ============================================================================
-- 3. Grant usage on extensions schema
-- ============================================================================
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- ============================================================================
-- Verification query (commented out - for manual testing)
-- ============================================================================

-- Check extension location:
-- SELECT e.extname, n.nspname as schema
-- FROM pg_extension e
-- JOIN pg_namespace n ON n.oid = e.extnamespace
-- WHERE e.extname = 'citext';
