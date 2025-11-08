-- Migration: Add function to check slug availability (bypasses RLS)
-- Date: 2025-11-08 11:10:00
-- Description: Creates a SECURITY DEFINER function to check slug availability
-- This runs as the function owner (postgres), bypassing RLS policies

CREATE OR REPLACE FUNCTION public.check_slug_available(slug_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Returns true if slug is available, false if taken
  RETURN NOT EXISTS (
    SELECT 1 
    FROM organizations 
    WHERE slug = slug_to_check
  );
END;
$$;

COMMENT ON FUNCTION public.check_slug_available IS 
  'Checks if an organization slug is available. Runs with SECURITY DEFINER to bypass RLS.';

-- Grant execute permission to service_role and authenticated users
GRANT EXECUTE ON FUNCTION public.check_slug_available(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_slug_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_slug_available(text) TO anon;
