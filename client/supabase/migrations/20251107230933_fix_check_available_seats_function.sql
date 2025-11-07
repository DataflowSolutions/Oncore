-- Fix check_available_seats function to handle edge cases better
-- and not throw exceptions when subscription is missing

CREATE OR REPLACE FUNCTION check_available_seats(p_org_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_seats int;
  v_used_seats int;
  v_available_seats int;
  v_plan_id text;
BEGIN
  -- Verify user has permission (must be org member)
  -- For development/testing, allow if no user (service role)
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = p_org_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied: not an org member';
  END IF;

  -- Get max seats from subscription plan (using max_members column)
  SELECT os.plan_id, bp.max_members 
  INTO v_plan_id, v_max_seats
  FROM org_subscriptions os
  JOIN billing_plans bp ON bp.id = os.plan_id
  WHERE os.org_id = p_org_id
  AND os.status IN ('active', 'trialing');
  
  -- If no subscription found or max_seats is NULL (unlimited), return safe defaults
  IF v_plan_id IS NULL THEN
    -- No active subscription - return error state
    RETURN jsonb_build_object(
      'org_id', p_org_id,
      'plan_id', null,
      'max_seats', 0,
      'used_seats', 0,
      'available_seats', 0,
      'can_invite', false,
      'error', 'No active subscription found'
    );
  END IF;
  
  -- If max_seats is NULL (unlimited plan like enterprise), return unlimited
  IF v_max_seats IS NULL THEN
    -- Count active members for display purposes
    SELECT COUNT(*) INTO v_used_seats
    FROM people
    WHERE org_id = p_org_id
      AND user_id IS NOT NULL;
      
    RETURN jsonb_build_object(
      'org_id', p_org_id,
      'plan_id', v_plan_id,
      'max_seats', 999999, -- Large number to indicate unlimited
      'used_seats', v_used_seats,
      'available_seats', 999999,
      'can_invite', true
    );
  END IF;

  -- Count active members (people with user accounts)
  SELECT COUNT(*) INTO v_used_seats
  FROM people
  WHERE org_id = p_org_id
    AND user_id IS NOT NULL;
  
  v_available_seats := v_max_seats - v_used_seats;
  
  RETURN jsonb_build_object(
    'org_id', p_org_id,
    'plan_id', v_plan_id,
    'max_seats', v_max_seats,
    'used_seats', v_used_seats,
    'available_seats', GREATEST(v_available_seats, 0),
    'can_invite', v_available_seats > 0
  );
END;
$$ LANGUAGE plpgsql;

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION check_available_seats(uuid) TO authenticated, service_role;
