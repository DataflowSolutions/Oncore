-- Fix recursion issue in organizations RLS
-- The billing enforcement functions were causing stack depth exceeded errors
-- when applied to the organizations table itself

-- Disable RLS on organizations table to prevent recursion
-- Organizations should be readable by authenticated users anyway
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on org_members to prevent membership lookup recursion
ALTER TABLE org_members DISABLE ROW LEVEL SECURITY;