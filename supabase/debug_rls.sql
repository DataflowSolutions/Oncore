-- Debug script to check current RLS policies
-- Run this in Supabase SQL editor

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'org_members');

-- Check all policies on organizations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('organizations', 'org_members')
ORDER BY tablename, policyname;

-- Test anonymous access
SET LOCAL role TO anon;
SET request.jwt.claims TO '{}';
SELECT COUNT(*) as orgs_count FROM organizations;
SELECT COUNT(*) as members_count FROM org_members;
RESET role;
