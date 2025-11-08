-- Fix: Ensure app_create_organization_with_owner can be executed by authenticated users
-- Problem: PostgREST might be blocking RPC calls even though function has SECURITY DEFINER
-- Solution: Explicitly grant EXECUTE and verify function permissions

-- Grant execute to authenticated users (not just service_role)
GRANT EXECUTE ON FUNCTION public.app_create_organization_with_owner(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_organization_with_owner(text, text) TO anon;

-- Verify the function exists and has correct settings
DO $$
DECLARE
  func_count integer;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'app_create_organization_with_owner'
    AND p.prosecdef = true; -- SECURITY DEFINER enabled
  
  IF func_count = 0 THEN
    RAISE EXCEPTION 'Function app_create_organization_with_owner not found or not SECURITY DEFINER';
  END IF;
  
  RAISE NOTICE 'Function verified: app_create_organization_with_owner has SECURITY DEFINER';
END $$;
