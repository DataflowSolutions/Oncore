-- Diagnostic function to test if auth.uid() is working
-- This will help us understand why RLS policies are failing

CREATE OR REPLACE FUNCTION test_auth_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'auth_uid', auth.uid(),
    'current_user', current_user,
    'session_user', session_user,
    'current_role', current_setting('role', true),
    'request_jwt_claim_sub', current_setting('request.jwt.claim.sub', true),
    'request_jwt_claims', current_setting('request.jwt.claims', true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION test_auth_context() TO authenticated, anon;

COMMENT ON FUNCTION test_auth_context() IS 'Diagnostic function to check auth context and JWT claims';
