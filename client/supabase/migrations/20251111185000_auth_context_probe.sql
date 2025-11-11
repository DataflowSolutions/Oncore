-- Diagnostic function to check auth context in production
-- Returns auth.uid(), JWT claims, and current role
-- Super useful for debugging RLS issues

CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'auth_uid', auth.uid(),
    'current_role', current_role::text,
    'jwt_claims', current_setting('request.jwt.claims', true),
    'session_user', session_user::text,
    'current_user', current_user::text
  ) INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION debug_auth_context IS 
'Diagnostic tool to check auth context. Helps debug RLS issues in production.';
