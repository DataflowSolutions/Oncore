-- Fix get_org_by_slug function to be owned by postgres
-- This is required for the transaction pooler to bypass RLS on org_members

ALTER FUNCTION get_org_by_slug(text) OWNER TO postgres;

COMMENT ON FUNCTION get_org_by_slug(text) IS 'Get organization by slug if user is a member. Owned by postgres to bypass RLS issues with transaction pooler.';
