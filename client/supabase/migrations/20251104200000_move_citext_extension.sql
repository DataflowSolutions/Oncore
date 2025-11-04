-- Migration: Move citext extension from public to extensions schema
-- Created: 2025-11-04
-- Description: Moves citext extension to a dedicated extensions schema for better security

-- ============================================================================
-- 1. Create extensions schema if it doesn't exist
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;

-- ============================================================================
-- 2. Move citext extension to extensions schema
-- ============================================================================
ALTER EXTENSION citext SET SCHEMA extensions;

-- ============================================================================
-- 3. Grant usage on extensions schema
-- ============================================================================
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- ============================================================================
-- 4. Update search_path for roles (optional but recommended)
-- ============================================================================
-- This ensures the extension types are still accessible
ALTER DATABASE postgres SET search_path TO public, extensions;

-- ============================================================================
-- Verification query (commented out - for manual testing)
-- ============================================================================

-- Check extension location:
-- SELECT e.extname, n.nspname as schema
-- FROM pg_extension e
-- JOIN pg_namespace n ON n.oid = e.extnamespace
-- WHERE e.extname = 'citext';
