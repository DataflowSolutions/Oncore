-- Check current RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual::text,
  with_check::text
FROM pg_policies 
WHERE tablename = 'org_members' 
ORDER BY policyname;

-- Also check the is_org_member function
SELECT pg_get_functiondef('public.is_org_member'::regproc);
