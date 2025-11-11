-- Get organization subscription status
-- Uses SECURITY DEFINER to bypass RLS issues

CREATE OR REPLACE FUNCTION get_org_subscription(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Verify user is a member of the org
  IF NOT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = p_org_id 
    AND user_id = v_user_id
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Get subscription details
  SELECT json_build_object(
    'org_id', org_id,
    'plan_id', plan_id,
    'status', status,
    'current_period_start', current_period_start,
    'current_period_end', current_period_end,
    'cancel_at_period_end', cancel_at_period_end,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO v_result
  FROM org_subscriptions
  WHERE org_id = p_org_id;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_subscription(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_subscription(uuid) IS 'Get org subscription if user is a member, bypassing RLS';
