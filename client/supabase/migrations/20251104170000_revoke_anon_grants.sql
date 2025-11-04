-- Migration: Revoke Anonymous Access Grants
-- Date: 2025-11-04
-- Description: Revokes all table-level grants from anon role on sensitive tables
-- Issue: anon role was granted SELECT on organizations and org_members, bypassing RLS

-- =====================================
-- REVOKE GRANTS FROM ANON ROLE
-- =====================================

-- Revoke all privileges from anon on organizations
REVOKE ALL ON organizations FROM anon;

-- Revoke all privileges from anon on org_members
REVOKE ALL ON org_members FROM anon;

-- Grant only what anon should have (none for these tables)
-- (RLS policies will handle authenticated access)

-- =====================================
-- VERIFICATION
-- =====================================

COMMENT ON TABLE organizations IS 
  'Organizations table - RLS enforced, anon grants revoked 2025-11-04';

COMMENT ON TABLE org_members IS 
  'Organization members table - RLS enforced, anon grants revoked 2025-11-04';
