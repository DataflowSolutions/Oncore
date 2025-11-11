-- Add function to check if organization slug is available
-- This is used during org creation to prevent duplicate slugs

CREATE OR REPLACE FUNCTION check_slug_available(slug_to_check text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM organizations WHERE slug = slug_to_check
  );
$$;

GRANT EXECUTE ON FUNCTION check_slug_available(text) TO anon, authenticated;
